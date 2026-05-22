import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { apiKey } from "@/db/schema";

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
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

    const keys = await db.query.apiKey.findMany({
      where: eq(apiKey.organizationId, ctx.orgId),
      columns: {
        id: true,
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const { raw, hash, prefix } = generateApiKey();

      const now = new Date();
      await db.insert(apiKey).values({
        id: createId(),
          organizationId: ctx.orgId,
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
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const key = await db.query.apiKey.findFirst({
        where: and(eq(apiKey.id, input.id), eq(apiKey.organizationId, ctx.orgId)),
      });
      if (!key) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(apiKey)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(apiKey.id, input.id));

      return { success: true };
    }),

  rotate: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const existing = await db.query.apiKey.findFirst({
        where: and(eq(apiKey.id, input.id), eq(apiKey.organizationId, ctx.orgId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const { raw, hash, prefix } = generateApiKey();

      await db
        .update(apiKey)
        .set({ keyHash: hash, keyPrefix: prefix, isActive: true, updatedAt: new Date() })
        .where(eq(apiKey.id, input.id));

      return { key: raw, prefix };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const key = await db.query.apiKey.findFirst({
        where: and(eq(apiKey.id, input.id), eq(apiKey.organizationId, ctx.orgId)),
      });
      if (!key) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(apiKey).where(eq(apiKey.id, input.id));
      return { success: true };
    }),

  validScopes: protectedProcedure.query(() => {
    return {
      scopes: VALID_SCOPES.map((s) => ({
        value: s,
        label: s.replace(":", " — ").replace("_", " "),
        description: scopeDescriptions[s],
      })),
    };
  }),
});

const scopeDescriptions: Record<(typeof VALID_SCOPES)[number], string> = {
  "classes:read": "Read class schedules and details",
  "bookings:read": "Read booking records",
  "bookings:write": "Create and cancel bookings",
  "members:read": "Read member profiles",
  "members:write": "Create and update member profiles",
  "memberships:read": "Read membership plans and subscriptions",
  "instructors:read": "Read instructor profiles",
};
