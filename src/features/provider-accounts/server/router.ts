import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import {
  resendProviderConfigSchema,
} from "@/features/provider-accounts/contracts";
import { requireCapability } from "@/features/permissions/server/authorization";
import { encrypt } from "@/lib/encryption";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { saveAdConversionAccountProcedure } from "./ad-account-procedure";
import { integrationLifecycleProcedures } from "./integration-lifecycle-procedures";
import { integrationProviderProcedures } from "./integration-procedures";
import { toPublicProviderAccount } from "./public-account";

type ProviderContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

function actor(ctx: ProviderContext) {
  return {
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
  };
}

function requireOrganization(ctx: ProviderContext): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select an organization before managing provider accounts.",
    });
  }
  return ctx.orgId;
}

function exactLocationWhere(locationId: string | null) {
  return locationId
    ? eq(providerAccount.locationId, locationId)
    : isNull(providerAccount.locationId);
}

const saveResendSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  apiKey: z.string().trim(),
  webhookSecret: z.string().trim(),
  defaultFromEmail: z.string().email(),
  defaultFromName: z.string().trim().min(1).max(120),
  defaultReplyTo: z.string().email().nullable().optional(),
  inheritToLocations: z.boolean().default(true),
});

export const providerAccountsRouter = createTRPCRouter({
  ...integrationProviderProcedures,
  ...integrationLifecycleProcedures,
  list: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrganization(ctx);
    await requireCapability({
      actor: actor(ctx),
      capability: "provider.manage",
    });
    const rows = await db
      .select()
      .from(providerAccount)
      .where(
        and(
          eq(providerAccount.organizationId, organizationId),
          ctx.locationId
            ? or(
                eq(providerAccount.locationId, ctx.locationId),
                isNull(providerAccount.locationId),
              )
            : isNull(providerAccount.locationId),
        ),
      );
    return rows.map((row) => ({
      ...toPublicProviderAccount(row),
      inherited: Boolean(ctx.locationId && !row.locationId),
    }));
  }),

  saveResend: protectedProcedure
    .input(saveResendSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx);
      await requireCapability({
        actor: actor(ctx),
        capability: "provider.manage",
      });
      const now = new Date();
      const config = resendProviderConfigSchema.parse({
        defaultFromEmail: input.defaultFromEmail,
        defaultFromName: input.defaultFromName,
        defaultReplyTo: input.defaultReplyTo ?? null,
        inheritToLocations: input.inheritToLocations,
      });
      const saved = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: providerAccount.id })
          .from(providerAccount)
          .where(
            and(
              eq(providerAccount.organizationId, organizationId),
              exactLocationWhere(ctx.locationId),
              eq(providerAccount.provider, "RESEND"),
              eq(providerAccount.isDefault, true),
            ),
          )
          .limit(1)
          .for("update");
        if (existing) {
          const [updated] = await tx
            .update(providerAccount)
            .set({
              displayName: input.displayName,
              encryptedSecret: input.apiKey
                ? encrypt(input.apiKey)
                : undefined,
              encryptedWebhookSecret: input.webhookSecret
                ? encrypt(input.webhookSecret)
                : undefined,
              status: "ACTIVE",
              capabilities: ["email.send", "domain.manage", "template.read"],
              config,
              lastErrorCode: null,
              updatedAt: now,
            })
            .where(eq(providerAccount.id, existing.id))
            .returning();
          return updated;
        }
        throw new TRPCError({
          code: "METHOD_NOT_SUPPORTED",
          message:
            "New workspaces use Aurea managed email. Add a sender domain instead of entering provider credentials.",
        });
      });
      if (!saved) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save the Resend provider account.",
        });
      }
      return toPublicProviderAccount(saved);
    }),

  saveAdConversion: saveAdConversionAccountProcedure,

  disconnect: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrganization(ctx);
      await requireCapability({
        actor: actor(ctx),
        capability: "provider.manage",
      });
      const [updated] = await db
        .update(providerAccount)
        .set({ status: "DISCONNECTED", updatedAt: new Date() })
        .where(
          and(
            eq(providerAccount.id, input.id),
            eq(providerAccount.organizationId, organizationId),
            exactLocationWhere(ctx.locationId),
          ),
        )
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider account not found in this workspace.",
        });
      }
      return toPublicProviderAccount(updated);
    }),
});
