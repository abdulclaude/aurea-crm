import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { booking, bookingEventType, calComCredential } from "@/db/schema";
import { getCalComClient } from "@/lib/calcom";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const locationTypeSchema = z.enum([
  "CAL_VIDEO",
  "PHONE",
  "IN_PERSON",
  "GOOGLE_MEET",
  "ZOOM",
  "MS_TEAMS",
  "CUSTOM",
]);

const customFieldSchema = z.record(z.string(), z.unknown());

function requireScope(ctx: { orgId: string | null; locationId: string | null }) {
  if (!ctx.orgId || !ctx.locationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please select a location to manage event types",
    });
  }
  return { organizationId: ctx.orgId, locationId: ctx.locationId };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function withBookingCount<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) {
    return [];
  }

  const counts = await Promise.all(
    rows.map(async (row) => {
      const [result] = await db
        .select({ total: count() })
        .from(booking)
        .where(eq(booking.eventTypeId, row.id));
      return [row.id, result?.total ?? 0] as const;
    }),
  );
  const countById = new Map(counts);

  return rows.map((row) => ({
    ...row,
    _count: { bookings: countById.get(row.id) ?? 0 },
  }));
}

function pricingMetadata(input: {
  pricingModel?: "flat" | "duration";
  durationPricing?: { duration: number; price: number }[];
}) {
  if (!input.pricingModel && !input.durationPricing) {
    return undefined;
  }

  return {
    pricing: {
      model:
        input.pricingModel ||
        (input.durationPricing && input.durationPricing.length > 0
          ? "duration"
          : "flat"),
      durationPricing: input.durationPricing || [],
    },
  };
}

export const eventTypesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireScope(ctx);
      const rows = await db.query.bookingEventType.findMany({
        where: and(
          eq(bookingEventType.organizationId, organizationId),
          eq(bookingEventType.locationId, locationId),
          input.includeInactive ? undefined : eq(bookingEventType.isActive, true),
          input.search
            ? or(
                ilike(bookingEventType.title, `%${input.search}%`),
                ilike(bookingEventType.description, `%${input.search}%`),
              )
            : undefined,
        ),
        orderBy: desc(bookingEventType.createdAt),
      });

      return withBookingCount(rows);
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireScope(ctx);
      const eventType = await db.query.bookingEventType.findFirst({
        where: and(
          eq(bookingEventType.id, input.id),
          eq(bookingEventType.organizationId, organizationId),
          eq(bookingEventType.locationId, locationId),
        ),
      });

      if (!eventType) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
      }

      return (await withBookingCount([eventType]))[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        duration: z.number().min(1),
        durationOptions: z.array(z.number()).optional(),
        locationType: locationTypeSchema,
        locationValue: z.string().optional(),
        availableLocations: z.array(locationTypeSchema).optional(),
        bufferTime: z.number().min(0).default(0),
        minimumNotice: z.number().min(0).default(0),
        slotInterval: z.number().min(1).optional(),
        maxBookingsPerDay: z.number().min(1).optional(),
        requiresConfirmation: z.boolean().default(false),
        isActive: z.boolean().default(true),
        customFields: z.array(customFieldSchema).optional(),
        requiresPayment: z.boolean().optional(),
        price: z.number().min(0).optional(),
        currency: z.string().optional(),
        pricingModel: z.enum(["flat", "duration"]).optional(),
        durationPricing: z
          .array(z.object({ duration: z.number().min(1), price: z.number().min(0) }))
          .optional(),
        syncToCalCom: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireScope(ctx);
      const existing = await db.query.bookingEventType.findFirst({
        where: and(
          eq(bookingEventType.slug, input.slug),
          eq(bookingEventType.organizationId, organizationId),
          eq(bookingEventType.locationId, locationId),
        ),
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An event type with this slug already exists",
        });
      }

      let calEventTypeId: number | null = null;
      if (input.syncToCalCom) {
        const credential = await db.query.calComCredential.findFirst({
          where: and(
            eq(calComCredential.organizationId, organizationId),
            eq(calComCredential.locationId, locationId),
            eq(calComCredential.isActive, true),
          ),
        });
        if (credential) {
          const calClient = await getCalComClient(credential.apiKey);
          const created = await calClient.createEventType({
            title: input.title,
            slug: input.slug,
            description: input.description,
            length: input.duration,
            hidden: !input.isActive,
            metadata: { aureaCrmEventType: true, locationId },
          } as Parameters<typeof calClient.createEventType>[0]);
          calEventTypeId = created.data.id;
        }
      }

      const [created] = await db
        .insert(bookingEventType)
        .values({
          id: randomUUID(),
          organizationId,
          locationId,
          title: input.title,
          slug: input.slug,
          description: input.description,
          length: input.duration,
          availableDurations: input.durationOptions ?? [],
          locationType: input.locationType,
          locationValue: input.locationValue,
          minimumBookingNotice: input.minimumNotice,
          slotInterval: input.slotInterval,
          requiresConfirmation: input.requiresConfirmation,
          isActive: input.isActive,
          customFields: input.customFields ?? [],
          requiresPayment: input.requiresPayment ?? false,
          price: input.price === undefined ? null : String(input.price),
          currency: input.currency,
          metadata: pricingMetadata(input),
          calEventTypeId,
          calTeamId: null,
          lastSyncedAt: calEventTypeId ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create event type",
        });
      }

      return (await withBookingCount([created]))[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        duration: z.number().min(1).optional(),
        durationOptions: z.array(z.number()).optional(),
        locationType: locationTypeSchema.optional(),
        locationValue: z.string().optional(),
        availableLocations: z.array(locationTypeSchema).optional(),
        bufferTime: z.number().min(0).optional(),
        minimumNotice: z.number().min(0).optional(),
        slotInterval: z.number().min(1).optional(),
        maxBookingsPerDay: z.number().min(1).optional(),
        requiresConfirmation: z.boolean().optional(),
        isActive: z.boolean().optional(),
        customFields: z.array(customFieldSchema).optional(),
        requiresPayment: z.boolean().optional(),
        price: z.number().min(0).optional(),
        currency: z.string().optional(),
        pricingModel: z.enum(["flat", "duration"]).optional(),
        durationPricing: z
          .array(z.object({ duration: z.number().min(1), price: z.number().min(0) }))
          .optional(),
        syncToCalCom: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireScope(ctx);
      const existing = await db.query.bookingEventType.findFirst({
        where: and(
          eq(bookingEventType.id, input.id),
          eq(bookingEventType.organizationId, organizationId),
          eq(bookingEventType.locationId, locationId),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
      }

      if (input.slug && input.slug !== existing.slug) {
        const slugExists = await db.query.bookingEventType.findFirst({
          where: and(
            eq(bookingEventType.slug, input.slug),
            eq(bookingEventType.organizationId, organizationId),
            eq(bookingEventType.locationId, locationId),
            ne(bookingEventType.id, input.id),
          ),
        });
        if (slugExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An event type with this slug already exists",
          });
        }
      }

      if (input.syncToCalCom && existing.calEventTypeId) {
        const credential = await db.query.calComCredential.findFirst({
          where: and(
            eq(calComCredential.organizationId, organizationId),
            eq(calComCredential.locationId, locationId),
            eq(calComCredential.isActive, true),
          ),
        });
        if (credential) {
          const calClient = await getCalComClient(credential.apiKey);
          await calClient.updateEventType(existing.calEventTypeId, {
            ...(input.title ? { title: input.title } : {}),
            ...(input.slug ? { slug: input.slug } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.duration ? { length: input.duration } : {}),
            ...(input.isActive !== undefined ? { hidden: !input.isActive } : {}),
            ...(input.requiresConfirmation !== undefined
              ? { requiresConfirmation: input.requiresConfirmation }
              : {}),
          });
        }
      }

      const existingMetadata = metadataRecord(existing.metadata);
      const nextPricingMetadata = pricingMetadata(input);
      const [updated] = await db
        .update(bookingEventType)
        .set({
          title: input.title,
          slug: input.slug,
          description: input.description,
          length: input.duration,
          availableDurations: input.durationOptions,
          locationType: input.locationType,
          locationValue: input.locationValue,
          minimumBookingNotice: input.minimumNotice,
          slotInterval: input.slotInterval,
          requiresConfirmation: input.requiresConfirmation,
          isActive: input.isActive,
          customFields: input.customFields,
          requiresPayment: input.requiresPayment,
          price: input.price === undefined ? undefined : String(input.price),
          currency: input.currency,
          metadata: nextPricingMetadata
            ? { ...existingMetadata, ...nextPricingMetadata }
            : undefined,
          lastSyncedAt: input.syncToCalCom ? new Date() : existing.lastSyncedAt,
          updatedAt: new Date(),
        })
        .where(eq(bookingEventType.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
      }

      return (await withBookingCount([updated]))[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), syncToCalCom: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireScope(ctx);
      const existing = await db.query.bookingEventType.findFirst({
        where: and(
          eq(bookingEventType.id, input.id),
          eq(bookingEventType.organizationId, organizationId),
          eq(bookingEventType.locationId, locationId),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
      }

      const [bookingCount] = await db
        .select({ total: count() })
        .from(booking)
        .where(eq(booking.eventTypeId, input.id));
      if ((bookingCount?.total ?? 0) > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete event type with ${bookingCount?.total ?? 0} existing bookings. Consider deactivating it instead.`,
        });
      }

      if (input.syncToCalCom && existing.calEventTypeId) {
        const credential = await db.query.calComCredential.findFirst({
          where: and(
            eq(calComCredential.organizationId, organizationId),
            eq(calComCredential.locationId, locationId),
            eq(calComCredential.isActive, true),
          ),
        });
        if (credential) {
          const calClient = await getCalComClient(credential.apiKey);
          await calClient.deleteEventType(existing.calEventTypeId);
        }
      }

      await db.delete(bookingEventType).where(eq(bookingEventType.id, input.id));
      return { success: true };
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireScope(ctx);
      const existing = await db.query.bookingEventType.findFirst({
        where: and(
          eq(bookingEventType.id, input.id),
          eq(bookingEventType.organizationId, organizationId),
          eq(bookingEventType.locationId, locationId),
        ),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
      }

      const [updated] = await db
        .update(bookingEventType)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(bookingEventType.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
      }

      return (await withBookingCount([updated]))[0];
    }),
});
