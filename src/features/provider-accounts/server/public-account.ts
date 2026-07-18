import type { providerAccount } from "@/db/schema";
import {
  type AdConversionConfig,
  adConversionProviderSchema,
  parseAdConversionConfig,
  type ResendProviderConfig,
  resendProviderConfigSchema,
  type SmsProviderConfig,
  smsProviderConfigSchema,
  smsProviderSchema,
  type TwilioPlatformProviderConfig,
  twilioPlatformProviderConfigSchema,
} from "@/features/provider-accounts/contracts";

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
    | AdConversionConfig
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
  const adProvider = adConversionProviderSchema.safeParse(row.provider);
  const adConfig = adProvider.success
    ? parseAdConfigSafely(adProvider.data, row.config)
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
        : adConfig;

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

function parseAdConfigSafely(
  provider: "META_CONVERSIONS" | "GOOGLE_ADS" | "TIKTOK_EVENTS",
  config: unknown,
): AdConversionConfig | null {
  try {
    return parseAdConversionConfig(provider, config);
  } catch {
    return null;
  }
}
