import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { providerAccount } from "@/db/schema";
import { integrationProviderSchema } from "@/features/provider-accounts/contracts";
import { parseIntegrationProviderConfig } from "@/features/provider-accounts/integration-catalog";
import { requireCapability } from "@/features/permissions/server/authorization";

export type ProviderContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export function requireProviderOrganization(ctx: ProviderContext) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing integrations.",
    });
  }
  return ctx.orgId;
}

export function exactProviderScope(ctx: ProviderContext, organizationId: string) {
  return and(
    eq(providerAccount.organizationId, organizationId),
    ctx.locationId
      ? eq(providerAccount.locationId, ctx.locationId)
      : isNull(providerAccount.locationId),
  );
}

export async function authorizeProviderManagement(
  ctx: ProviderContext,
  organizationId: string,
) {
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId,
      locationId: ctx.locationId,
    },
    capability: "provider.manage",
    resource: { organizationId, locationId: ctx.locationId },
  });
}

export function integrationProviderWhere() {
  return inArray(providerAccount.provider, integrationProviderSchema.options);
}

export function publicIntegrationAccount(
  row: typeof providerAccount.$inferSelect,
) {
  const provider = integrationProviderSchema.parse(row.provider);
  const config = parseIntegrationProviderConfig(provider, row.config);
  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    provider,
    displayName: row.displayName,
    status: row.status,
    capabilities: row.capabilities ?? [],
    config,
    hasSecret: Boolean(row.encryptedSecret),
    hasWebhookSecret: Boolean(row.encryptedWebhookSecret),
    lastHealthCheckAt: row.lastHealthCheckAt,
    lastSuccessAt: row.lastSuccessAt,
    lastErrorCode: row.lastErrorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function requireIntegrationAccount(
  row: typeof providerAccount.$inferSelect | undefined,
) {
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Integration account not found in this workspace.",
    });
  }
  return publicIntegrationAccount(row);
}
