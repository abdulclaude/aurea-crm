import type { providerAccount } from "@/db/schema";
import {
  type IntegrationProviderConfig,
  integrationProviderSchema,
  type ResendProviderConfig,
  resendProviderConfigSchema,
  type SmsProviderConfig,
  smsProviderConfigSchema,
  smsProviderSchema,
  type TwilioPlatformProviderConfig,
  twilioPlatformProviderConfigSchema,
} from "@/features/provider-accounts/contracts";
import { parseIntegrationProviderConfig } from "@/features/provider-accounts/integration-catalog";

export type PublicProviderAccount = {
  id: string;
  organizationId: string;
  locationId: string | null;
  provider: string;
  displayName: string;
  externalAccountId: string | null;
  environment: string;
  status: string;
  ownershipMode: "PLATFORM_MANAGED" | "TENANT_MANAGED_LEGACY";
  isDefault: boolean;
  capabilities: string[];
  config:
    | ResendProviderConfig
    | SmsProviderConfig
    | PublicTwilioPlatformConfig
    | IntegrationProviderConfig
    | null;
  hasSecret: boolean;
  hasWebhookSecret: boolean;
  lastHealthCheckAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PublicTwilioPlatformConfig = Omit<
  TwilioPlatformProviderConfig,
  "addressSid" | "bundleSid" | "identitySid"
> & {
  hasAddress: boolean;
  hasBundle: boolean;
  hasIdentity: boolean;
};

export function toPublicProviderAccount(
  row: typeof providerAccount.$inferSelect,
): PublicProviderAccount {
  const resendConfig =
    row.provider === "RESEND"
      ? resendProviderConfigSchema.safeParse(row.config)
      : null;
  const smsProvider = smsProviderSchema.safeParse(row.provider);
  const smsConfig = smsProvider.success
    ? smsProviderConfigSchema.safeParse(row.config)
    : null;
  const twilioPlatformConfig =
    row.provider === "TWILIO" && row.ownershipMode === "PLATFORM_MANAGED"
      ? twilioPlatformProviderConfigSchema.safeParse(row.config)
      : null;
  const integrationProvider = integrationProviderSchema.safeParse(row.provider);
  const integrationConfig = integrationProvider.success
    ? parseIntegrationConfigSafely(integrationProvider.data, row.config)
    : null;
  const config =
    resendConfig?.success === true
      ? resendConfig.data
      : twilioPlatformConfig?.success === true
        ? {
            schemaVersion: twilioPlatformConfig.data.schemaVersion,
            ownershipMode: twilioPlatformConfig.data.ownershipMode,
            inheritToLocations: twilioPlatformConfig.data.inheritToLocations,
            complianceStatus: twilioPlatformConfig.data.complianceStatus,
            hasAddress: Boolean(twilioPlatformConfig.data.addressSid),
            hasBundle: Boolean(twilioPlatformConfig.data.bundleSid),
            hasIdentity: Boolean(twilioPlatformConfig.data.identitySid),
          }
        : smsConfig?.success === true
        ? smsConfig.data
        : integrationConfig;

  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    provider: row.provider,
    displayName: row.displayName,
    externalAccountId:
      row.ownershipMode === "PLATFORM_MANAGED"
        ? null
        : row.externalAccountId,
    environment: row.environment,
    status: row.status,
    ownershipMode: row.ownershipMode,
    isDefault: row.isDefault,
    capabilities: row.capabilities ?? [],
    config,
    hasSecret:
      row.ownershipMode === "PLATFORM_MANAGED"
        ? false
        : Boolean(row.encryptedSecret),
    hasWebhookSecret:
      row.ownershipMode === "PLATFORM_MANAGED"
        ? false
        : Boolean(row.encryptedWebhookSecret),
    lastHealthCheckAt: row.lastHealthCheckAt,
    lastSuccessAt: row.lastSuccessAt,
    lastErrorCode: row.lastErrorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseIntegrationConfigSafely(
  provider:
    | "CLASSPASS"
    | "WELLHUB"
    | "KISI"
    | "MAILCHIMP"
    | "ZOOM"
    | "SPIVI",
  config: unknown,
): IntegrationProviderConfig | null {
  try {
    return parseIntegrationProviderConfig(provider, config);
  } catch {
    return null;
  }
}
