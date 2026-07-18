import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import {
  integrationProviderSchema,
  integrationSyncDirectionSchema,
} from "@/features/provider-accounts/contracts";
import {
  getIntegrationProviderDefinition,
  integrationProviderCatalog,
} from "@/features/provider-accounts/integration-catalog";
import {
  integrationAccountMatchesScope,
  validateIntegrationDraft,
} from "@/features/provider-accounts/lib/integration-policy";
import { encrypt } from "@/lib/encryption";
import { protectedProcedure } from "@/trpc/init";

import {
  authorizeProviderManagement,
  exactProviderScope,
  integrationProviderWhere,
  publicIntegrationAccount,
  requireProviderOrganization,
} from "./integration-server-policy";

const integrationInputSchema = z.object({
  id: z.string().min(1).optional(),
  provider: integrationProviderSchema,
  displayName: z.string().trim().min(1).max(120),
  inheritToLocations: z.boolean().default(false),
  syncDirection: integrationSyncDirectionSchema,
  settings: z.record(z.string(), z.string().max(2048)).default({}),
  credentials: z.record(z.string(), z.string().max(8192)).optional(),
});

export const integrationProviderProcedures = {
  integrationCatalog: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireProviderOrganization(ctx);
    await authorizeProviderManagement(ctx, orgId);
    return integrationProviderCatalog;
  }),

  listIntegrations: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireProviderOrganization(ctx);
    await authorizeProviderManagement(ctx, orgId);
    const rows = await db
      .select()
      .from(providerAccount)
      .where(
        and(
          eq(providerAccount.organizationId, orgId),
          integrationProviderWhere(),
          ctx.locationId
            ? or(
                eq(providerAccount.locationId, ctx.locationId),
                isNull(providerAccount.locationId),
              )
            : isNull(providerAccount.locationId),
        ),
      );

    return rows
      .map(publicIntegrationAccount)
      .filter((account) =>
        integrationAccountMatchesScope(account, {
          organizationId: orgId,
          locationId: ctx.locationId,
        }),
      )
      .map((account) => ({
        ...account,
        inherited: Boolean(ctx.locationId && !account.locationId),
      }));
  }),

  validateIntegration: protectedProcedure
    .input(integrationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = requireProviderOrganization(ctx);
      await authorizeProviderManagement(ctx, orgId);
      const existing = input.id
        ? await db.query.providerAccount.findFirst({
            where: and(
              eq(providerAccount.id, input.id),
              exactProviderScope(ctx, orgId),
              eq(providerAccount.provider, input.provider),
            ),
            columns: { encryptedSecret: true },
          })
        : null;
      const validation = validateIntegrationDraft({
        ...input,
        syncCursor: null,
        resourceMappings: [],
        hasStoredSecret: Boolean(existing?.encryptedSecret),
      });
      return {
        valid: validation.valid,
        canAttemptRemoteCheck: validation.canAttemptRemoteCheck,
        readiness: validation.readiness,
        issues: validation.issues,
        config: validation.config,
        remoteCheckPerformed: false,
      };
    }),

  saveIntegration: protectedProcedure
    .input(integrationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = requireProviderOrganization(ctx);
      await authorizeProviderManagement(ctx, orgId);
      const now = new Date();
      const definition = getIntegrationProviderDefinition(input.provider);
      const saved = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(providerAccount)
          .where(
            and(
              exactProviderScope(ctx, orgId),
              eq(providerAccount.provider, input.provider),
              input.id
                ? eq(providerAccount.id, input.id)
                : eq(providerAccount.isDefault, true),
            ),
          )
          .limit(1)
          .for("update");
        const validation = validateIntegrationDraft({
          ...input,
          syncCursor: null,
          resourceMappings: [],
          hasStoredSecret: Boolean(existing?.encryptedSecret),
        });
        if (!validation.valid || !validation.config) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.issues.join(" ") || "Integration configuration is invalid.",
          });
        }
        const secret = validation.secret;
        const encryptedSecret = secret
          ? encrypt(JSON.stringify({ ...secret, webhookSecret: undefined }))
          : undefined;
        const encryptedWebhookSecret = secret?.webhookSecret
          ? encrypt(secret.webhookSecret)
          : undefined;
        const values = {
          displayName: input.displayName,
          encryptedSecret,
          encryptedWebhookSecret,
          ownershipMode: "TENANT_MANAGED_LEGACY" as const,
          status: "PENDING_VERIFICATION",
          capabilities: definition.capabilities,
          config: validation.config,
          lastHealthCheckAt: null,
          lastSuccessAt: null,
          lastErrorCode: "REMOTE_CHECK_REQUIRED",
          updatedAt: now,
        };

        if (existing) {
          const [updated] = await tx
            .update(providerAccount)
            .set(values)
            .where(
              and(
                eq(providerAccount.id, existing.id),
                exactProviderScope(ctx, orgId),
                eq(providerAccount.provider, input.provider),
              ),
            )
            .returning();
          return updated;
        }

        const [created] = await tx
          .insert(providerAccount)
          .values({
            id: crypto.randomUUID(),
            organizationId: orgId,
            locationId: ctx.locationId,
            provider: input.provider,
            isDefault: true,
            createdByUserId: ctx.auth.user.id,
            ...values,
          })
          .returning();
        return created;
      });
      if (!saved) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The integration account could not be saved.",
        });
      }
      return publicIntegrationAccount(saved);
    }),
};
