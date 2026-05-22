import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { BookingLocationType } from "@/db/enums";
import { bookingEventType, calComCredential } from "@/db/schema";
import { createCalComClient } from "@/lib/calcom";
import { decrypt, encrypt } from "@/lib/encryption";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const credentialColumns = {
  id: true,
  isActive: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const credentialReturning = {
  id: calComCredential.id,
  isActive: calComCredential.isActive,
  lastSyncedAt: calComCredential.lastSyncedAt,
  createdAt: calComCredential.createdAt,
  updatedAt: calComCredential.updatedAt,
};

const calUserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  email: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
});

const calEventTypeSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  length: z.number(),
  hidden: z.boolean().optional(),
  locations: z.array(z.object({ type: z.string().optional() })).optional(),
});

function requireContext(ctx: { orgId: string | null; locationId: string | null }): {
  orgId: string;
  locationId: string;
} {
  if (!ctx.locationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please select a location",
    });
  }
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization context required",
    });
  }
  return { orgId: ctx.orgId, locationId: ctx.locationId };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function extractCalUser(value: unknown): z.infer<typeof calUserSchema> | null {
  const root = asRecord(value);
  if (!root) return null;

  const data = asRecord(root.data);
  const candidates = [
    data ? asRecord(data.user) : null,
    data,
    asRecord(root.user),
    root,
  ];

  for (const candidate of candidates) {
    const parsed = calUserSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }

  return null;
}

function extractArrayAt(value: unknown, path: string[]): unknown[] | null {
  let current: unknown = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return null;
    current = record[key];
  }
  return Array.isArray(current) ? current : null;
}

function extractEventTypes(value: unknown): Array<z.infer<typeof calEventTypeSchema>> {
  const candidates = [
    extractArrayAt(value, ["data"]),
    extractArrayAt(value, ["eventTypes"]),
    extractArrayAt(value, ["event_types"]),
    extractArrayAt(value, ["data", "eventTypes"]),
    extractArrayAt(value, ["data", "event_types"]),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = z.array(calEventTypeSchema).safeParse(candidate);
    if (parsed.success) return parsed.data;
  }

  return [];
}

function mapCalLocationType(type: string | undefined): BookingLocationType {
  if (type === "integrations:daily") return BookingLocationType.CAL_VIDEO;
  if (type === "integrations:google:meet") return BookingLocationType.GOOGLE_MEET;
  if (type === "integrations:zoom") return BookingLocationType.ZOOM;
  if (type === "integrations:office365_video") return BookingLocationType.MS_TEAMS;
  if (type === "phone") return BookingLocationType.PHONE;
  if (type === "inPerson") return BookingLocationType.IN_PERSON;
  return BookingLocationType.CUSTOM;
}

export const calComCredentialsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const { orgId, locationId } = requireContext(ctx);

    return db.query.calComCredential.findFirst({
      where: and(
        eq(calComCredential.organizationId, orgId),
        eq(calComCredential.locationId, locationId)
      ),
      columns: credentialColumns,
    });
  }),

  testConnection: protectedProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const calClient = createCalComClient(input.apiKey);
      try {
        const response: unknown = await calClient.getMe();
        const user = extractCalUser(response);

        if (user) {
          return {
            success: true,
            user: {
              id: user.id,
              email: user.email ?? "",
              name: user.name ?? "",
              username: user.username ?? "",
            },
          };
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch Cal.com profile.";
        try {
          const eventTypes: unknown = await calClient.getEventTypes();
          if (extractEventTypes(eventTypes).length > 0) {
            return {
              success: true,
              user: {
                id: 0,
                email: "Connected",
                name: "Cal.com",
                username: "connected",
              },
            };
          }
          return {
            success: false,
            error: `Cal.com response missing user data and event types: ${JSON.stringify(eventTypes)}`,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error:
              fallbackError instanceof Error
                ? `${message} (fallback failed: ${fallbackError.message})`
                : message,
          };
        }
      }

      return { success: false, error: "Cal.com response missing user data" };
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        testConnection: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId, locationId } = requireContext(ctx);

      if (input.testConnection) {
        try {
          const calClient = createCalComClient(input.apiKey);
          await calClient.getMe();
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to connect to Cal.com. Please check your API key.",
          });
        }
      }

      const encryptedApiKey = encrypt(input.apiKey.trim());
      const existing = await db.query.calComCredential.findFirst({
        where: and(
          eq(calComCredential.organizationId, orgId),
          eq(calComCredential.locationId, locationId)
        ),
      });

      if (existing) {
        const [credential] = await db
          .update(calComCredential)
          .set({
            apiKey: encryptedApiKey,
            isActive: true,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(calComCredential.id, existing.id))
          .returning(credentialReturning);
        return credential;
      }

      const [credential] = await db
        .insert(calComCredential)
        .values({
          id: randomUUID(),
          organizationId: orgId,
          locationId,
          apiKey: encryptedApiKey,
          isActive: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(credentialReturning);

      return credential;
    }),

  remove: protectedProcedure.mutation(async ({ ctx }) => {
    const { orgId, locationId } = requireContext(ctx);

    const credential = await db.query.calComCredential.findFirst({
      where: and(
        eq(calComCredential.organizationId, orgId),
        eq(calComCredential.locationId, locationId)
      ),
      columns: { id: true },
    });

    if (!credential) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cal.com credential not found" });
    }

    await db.delete(calComCredential).where(eq(calComCredential.id, credential.id));

    return { success: true };
  }),

  toggleActive: protectedProcedure.mutation(async ({ ctx }) => {
    const { orgId, locationId } = requireContext(ctx);

    const credential = await db.query.calComCredential.findFirst({
      where: and(
        eq(calComCredential.organizationId, orgId),
        eq(calComCredential.locationId, locationId)
      ),
    });

    if (!credential) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cal.com credential not found" });
    }

    const [updated] = await db
      .update(calComCredential)
      .set({ isActive: !credential.isActive, updatedAt: new Date() })
      .where(eq(calComCredential.id, credential.id))
      .returning(credentialReturning);

    return updated;
  }),

  syncEventTypes: protectedProcedure.mutation(async ({ ctx }) => {
    const { orgId, locationId } = requireContext(ctx);

    const credential = await db.query.calComCredential.findFirst({
      where: and(
        eq(calComCredential.organizationId, orgId),
        eq(calComCredential.locationId, locationId),
        eq(calComCredential.isActive, true)
      ),
    });

    if (!credential) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active Cal.com credential found" });
    }

    try {
      const calClient = createCalComClient(decrypt(credential.apiKey));
      const eventTypes = await calClient.getEventTypes();
      const eventTypesList = extractEventTypes(eventTypes);

      if (eventTypesList.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cal.com returned no event types for this account. Response: ${JSON.stringify(eventTypes).slice(0, 500)}`,
        });
      }

      let synced = 0;
      let created = 0;
      let updated = 0;

      for (const calEventType of eventTypesList) {
        const existing = await db.query.bookingEventType.findFirst({
          where: and(
            eq(bookingEventType.calEventTypeId, calEventType.id),
            eq(bookingEventType.organizationId, orgId),
            eq(bookingEventType.locationId, locationId)
          ),
          columns: { id: true },
        });

        const eventTypeData = {
          title: calEventType.title,
          slug: calEventType.slug,
          description: calEventType.description ?? null,
          length: calEventType.length,
          locationType: mapCalLocationType(calEventType.locations?.[0]?.type),
          isActive: !calEventType.hidden,
          updatedAt: new Date(),
        };

        if (existing) {
          await db
            .update(bookingEventType)
            .set(eventTypeData)
            .where(eq(bookingEventType.id, existing.id));
          updated++;
        } else {
          await db.insert(bookingEventType).values({
            id: randomUUID(),
            organizationId: orgId,
            locationId,
            calEventTypeId: calEventType.id,
            ...eventTypeData,
          });
          created++;
        }

        synced++;
      }

      await db
        .update(calComCredential)
        .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(calComCredential.id, credential.id));

      return { success: true, synced, created, updated };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to sync event types from Cal.com",
      });
    }
  }),
});
