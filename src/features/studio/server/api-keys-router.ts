import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { apiKey } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `ak_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

const VALID_SCOPES = [
  "classes:read",
  "bookings:read",
  "bookings:write",
  "members:read",
  "members:write",
  "memberships:read",
  "instructors:read",
] as const;

export const apiKeysRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await authorizeApiKeys(ctx, "settings.view");

    const keys = await db.query.apiKey.findMany({
      where: and(
        eq(apiKey.organizationId, organizationId),
        ctx.locationId
          ? or(eq(apiKey.locationId, ctx.locationId), isNull(apiKey.locationId))
          : isNull(apiKey.locationId),
      ),
      columns: {
        id: true,
        locationId: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: desc(apiKey.createdAt),
    });

    return { keys: keys.map((key) => ({ ...key, scopes: key.scopes ?? [] })) };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.enum(VALID_SCOPES)).min(1),
        expiresAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeApiKeys(ctx, "settings.manage");
      if (!ctx.locationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select a location before creating an API key",
        });
      }

      const { raw, hash, prefix } = generateApiKey();

      const now = new Date();
      await db.insert(apiKey).values({
        id: createId(),
        organizationId,
        locationId: ctx.locationId,
        name: input.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        createdBy: ctx.auth.user.id,
        createdAt: now,
        updatedAt: now,
      });

      return { key: raw, prefix };
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeApiKeys(ctx, "settings.manage");

      const key = await db.query.apiKey.findFirst({
        where: apiKeyMutationWhere(input.id, organizationId, ctx.locationId),
      });
      if (!key) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(apiKey)
        .set({ isActive: false, updatedAt: new Date() })
        .where(apiKeyMutationWhere(input.id, organizationId, ctx.locationId));

      return { success: true };
    }),

  rotate: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeApiKeys(ctx, "settings.manage");

      const existing = await db.query.apiKey.findFirst({
        where: apiKeyMutationWhere(input.id, organizationId, ctx.locationId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const { raw, hash, prefix } = generateApiKey();

      await db
        .update(apiKey)
        .set({
          keyHash: hash,
          keyPrefix: prefix,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(apiKeyMutationWhere(input.id, organizationId, ctx.locationId));

      return { key: raw, prefix };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeApiKeys(ctx, "settings.manage");

      const key = await db.query.apiKey.findFirst({
        where: apiKeyMutationWhere(input.id, organizationId, ctx.locationId),
      });
      if (!key) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .delete(apiKey)
        .where(apiKeyMutationWhere(input.id, organizationId, ctx.locationId));
      return { success: true };
    }),

  validScopes: protectedProcedure.query(async ({ ctx }) => {
    await authorizeApiKeys(ctx, "settings.view");
    return {
      scopes: VALID_SCOPES.map((s) => ({
        value: s,
        label: s.replace(":", " — ").replace("_", " "),
        description: scopeDescriptions[s],
      })),
    };
  }),
});

type ApiKeyContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

async function authorizeApiKeys(
  ctx: ApiKeyContext,
  capability: "settings.view" | "settings.manage",
): Promise<string> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organisation",
    });
  }
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
    resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
  });
  return ctx.orgId;
}

function apiKeyMutationWhere(
  id: string,
  organizationId: string,
  locationId: string | null,
) {
  return and(
    eq(apiKey.id, id),
    eq(apiKey.organizationId, organizationId),
    locationId ? eq(apiKey.locationId, locationId) : isNull(apiKey.locationId),
  );
}

const scopeDescriptions: Record<(typeof VALID_SCOPES)[number], string> = {
  "classes:read": "Read class schedules and details",
  "bookings:read": "Read booking records",
  "bookings:write": "Create and cancel bookings",
  "members:read": "Read member profiles",
  "members:write": "Create and update member profiles",
  "memberships:read": "Read membership plans and subscriptions",
  "instructors:read": "Read instructor profiles",
};
