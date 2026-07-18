import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import { integrationProviderSchema } from "@/features/provider-accounts/contracts";
import { parseIntegrationProviderConfig } from "@/features/provider-accounts/integration-catalog";
import { protectedProcedure } from "@/trpc/init";
import {
  authorizeProviderManagement,
  exactProviderScope,
  integrationProviderWhere,
  type ProviderContext,
  requireIntegrationAccount,
  requireProviderOrganization,
} from "./integration-server-policy";

const accountIdSchema = z.object({ id: z.string().min(1) });

export const integrationLifecycleProcedures = {
  pauseIntegration: protectedProcedure
    .input(accountIdSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireProviderOrganization(ctx);
      await authorizeProviderManagement(ctx, organizationId);
      const [updated] = await db
        .update(providerAccount)
        .set({ status: "PAUSED", updatedAt: new Date() })
        .where(
          and(
            eq(providerAccount.id, input.id),
            exactProviderScope(ctx, organizationId),
            integrationProviderWhere(),
          ),
        )
        .returning();
      return requireIntegrationAccount(updated);
    }),

  reconnectIntegration: protectedProcedure
    .input(accountIdSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireProviderOrganization(ctx);
      await authorizeProviderManagement(ctx, organizationId);
      const updated = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(providerAccount)
          .where(
            and(
              eq(providerAccount.id, input.id),
              exactProviderScope(ctx, organizationId),
              integrationProviderWhere(),
            ),
          )
          .limit(1)
          .for("update");
        if (!current?.encryptedSecret) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Save provider credentials before reconnecting this integration.",
          });
        }
        const provider = integrationProviderSchema.parse(current.provider);
        const config = parseIntegrationProviderConfig(provider, current.config);
        const [row] = await tx
          .update(providerAccount)
          .set({
            status: "PENDING_VERIFICATION",
            config: { ...config, readiness: "NEEDS_REMOTE_VERIFICATION" },
            lastHealthCheckAt: null,
            lastSuccessAt: null,
            lastErrorCode: "REMOTE_CHECK_REQUIRED",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(providerAccount.id, input.id),
              exactProviderScope(ctx, organizationId),
              integrationProviderWhere(),
            ),
          )
          .returning();
        return row;
      });
      return requireIntegrationAccount(updated);
    }),

  disconnectIntegration: protectedProcedure
    .input(accountIdSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireProviderOrganization(ctx);
      await authorizeProviderManagement(ctx, organizationId);
      const updated = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(providerAccount)
          .where(
            and(
              eq(providerAccount.id, input.id),
              exactProviderScope(ctx, organizationId),
              integrationProviderWhere(),
            ),
          )
          .limit(1)
          .for("update");
        if (!current) return undefined;
        const provider = integrationProviderSchema.parse(current.provider);
        const config = parseIntegrationProviderConfig(provider, current.config);
        const [row] = await tx
          .update(providerAccount)
          .set({
            status: "DISCONNECTED",
            encryptedSecret: null,
            encryptedWebhookSecret: null,
            config: { ...config, readiness: "NEEDS_CREDENTIALS" },
            lastHealthCheckAt: null,
            lastSuccessAt: null,
            lastErrorCode: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(providerAccount.id, input.id),
              exactProviderScope(ctx, organizationId),
              integrationProviderWhere(),
            ),
          )
          .returning();
        return row;
      });
      return requireIntegrationAccount(updated);
    }),

  deleteIntegration: protectedProcedure
    .input(accountIdSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireProviderOrganization(ctx);
      await authorizeProviderManagement(ctx, organizationId);
      const [deleted] = await db
        .delete(providerAccount)
        .where(
          and(
            eq(providerAccount.id, input.id),
            exactProviderScope(ctx, organizationId),
            integrationProviderWhere(),
            eq(providerAccount.status, "DISCONNECTED"),
          ),
        )
        .returning();
      return requireIntegrationAccount(deleted);
    }),
};
