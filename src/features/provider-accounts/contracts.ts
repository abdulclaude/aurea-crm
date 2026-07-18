import { z } from "zod";

export const smsProviderSchema = z.enum([
  "TWILIO",
  "VONAGE",
  "MESSAGEBIRD",
]);
export type SmsProvider = z.infer<typeof smsProviderSchema>;

export const providerAccountProviderSchema = z.enum([
  "RESEND",
  "TWILIO",
  "VONAGE",
  "MESSAGEBIRD",
  "GOOGLE_WORKSPACE",
  "MICROSOFT_365",
  "SLACK_OAUTH",
  "DISCORD_OAUTH",
  "META_CONVERSIONS",
  "GOOGLE_ADS",
  "TIKTOK_EVENTS",
]);
export type ProviderAccountProvider = z.infer<
  typeof providerAccountProviderSchema
>;

export const providerOwnershipModeSchema = z.enum([
  "PLATFORM_MANAGED",
  "TENANT_MANAGED_LEGACY",
]);
export type ProviderOwnershipMode = z.infer<
  typeof providerOwnershipModeSchema
>;

export const resendProviderConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  ownershipMode: providerOwnershipModeSchema.default(
    "TENANT_MANAGED_LEGACY",
  ),
  defaultFromEmail: z.string().email().nullable().default(null),
  defaultFromName: z.string().trim().min(1).nullable().default(null),
  defaultReplyTo: z.string().email().nullable().default(null),
  inheritToLocations: z.boolean().default(true),
});

export type ResendProviderConfig = z.infer<typeof resendProviderConfigSchema>;

export const smsProviderConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  ownershipMode: providerOwnershipModeSchema.default(
    "TENANT_MANAGED_LEGACY",
  ),
  fromNumber: z.string().trim().min(1),
  inheritToLocations: z.boolean().default(true),
});

export type SmsProviderConfig = z.infer<typeof smsProviderConfigSchema>;

export const twilioPlatformProviderConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  ownershipMode: z.literal("PLATFORM_MANAGED"),
  inheritToLocations: z.literal(true).default(true),
  complianceStatus: z
    .enum(["NOT_CONFIGURED", "PENDING", "APPROVED", "REJECTED"])
    .default("NOT_CONFIGURED"),
  addressSid: z.string().regex(/^AD[a-fA-F0-9]{32}$/).nullable().default(null),
  bundleSid: z.string().regex(/^BU[a-fA-F0-9]{32}$/).nullable().default(null),
  identitySid: z.string().regex(/^RI[a-fA-F0-9]{32}$/).nullable().default(null),
});
export type TwilioPlatformProviderConfig = z.infer<
  typeof twilioPlatformProviderConfigSchema
>;

export const oauthProviderAccountSchema = z.enum([
  "GOOGLE_WORKSPACE",
  "MICROSOFT_365",
  "SLACK_OAUTH",
  "DISCORD_OAUTH",
]);
export type OAuthProviderAccount = z.infer<
  typeof oauthProviderAccountSchema
>;

export const oauthProviderConfigSchema = z.object({
  inheritToLocations: z.boolean().default(false),
  channelId: z.string().trim().min(1).nullable().default(null),
  guildId: z.string().trim().min(1).nullable().default(null),
});
export type OAuthProviderConfig = z.infer<typeof oauthProviderConfigSchema>;

export const adConversionProviderSchema = z.enum([
  "META_CONVERSIONS",
  "GOOGLE_ADS",
  "TIKTOK_EVENTS",
]);
export type AdConversionProvider = z.infer<
  typeof adConversionProviderSchema
>;

const adInheritanceSchema = z.object({
  inheritToLocations: z.boolean().default(false),
});

export const metaConversionConfigSchema = adInheritanceSchema.extend({
  pixelId: z.string().trim().min(1).max(100),
  testEventCode: z.string().trim().min(1).max(100).nullable().default(null),
});
export const googleAdsConversionConfigSchema = adInheritanceSchema.extend({
  customerId: z.string().trim().regex(/^\d{6,20}$/),
  conversionActionId: z.string().trim().regex(/^\d{1,30}$/),
  loginCustomerId: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/)
    .nullable()
    .default(null),
});
export const tiktokEventsConfigSchema = adInheritanceSchema.extend({
  pixelCode: z.string().trim().min(1).max(100),
  testEventCode: z.string().trim().min(1).max(100).nullable().default(null),
});

export const adConversionConfigSchema = z.discriminatedUnion("provider", [
  metaConversionConfigSchema.extend({ provider: z.literal("META_CONVERSIONS") }),
  googleAdsConversionConfigSchema.extend({ provider: z.literal("GOOGLE_ADS") }),
  tiktokEventsConfigSchema.extend({ provider: z.literal("TIKTOK_EVENTS") }),
]);
export type AdConversionConfig = z.infer<typeof adConversionConfigSchema>;

export const metaConversionSecretSchema = z.object({
  accessToken: z.string().trim().min(1).max(4096),
});
export const googleAdsConversionSecretSchema = z.object({
  developerToken: z.string().trim().min(1).max(4096),
  accessToken: z.string().trim().min(1).max(8192),
});
export const tiktokEventsSecretSchema = z.object({
  accessToken: z.string().trim().min(1).max(4096),
});

export const adConversionSecretSchema = z.discriminatedUnion("provider", [
  metaConversionSecretSchema.extend({ provider: z.literal("META_CONVERSIONS") }),
  googleAdsConversionSecretSchema.extend({ provider: z.literal("GOOGLE_ADS") }),
  tiktokEventsSecretSchema.extend({ provider: z.literal("TIKTOK_EVENTS") }),
]);
export type AdConversionSecret = z.infer<typeof adConversionSecretSchema>;

export function parseAdConversionConfig(
  provider: AdConversionProvider,
  value: unknown,
): AdConversionConfig {
  return adConversionConfigSchema.parse({
    ...(typeof value === "object" && value !== null ? value : {}),
    provider,
  });
}
