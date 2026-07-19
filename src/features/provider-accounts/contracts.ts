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
  "CLASSPASS",
  "WELLHUB",
  "KISI",
  "MAILCHIMP",
  "ZOOM",
  "SPIVI",
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

export const integrationProviderFamilySchema = z.enum([
  "MARKETPLACE",
  "ACCESS_CONTROL",
  "MARKETING_SYNC",
  "VIDEO_MEETING",
  "FITNESS_DISPLAY",
]);
export type IntegrationProviderFamily = z.infer<
  typeof integrationProviderFamilySchema
>;

export const integrationProviderSchema = z.enum([
  "CLASSPASS",
  "WELLHUB",
  "KISI",
  "MAILCHIMP",
  "ZOOM",
  "SPIVI",
]);
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;

export const integrationSyncDirectionSchema = z.enum([
  "INBOUND",
  "OUTBOUND",
  "BIDIRECTIONAL",
  "NONE",
]);
export type IntegrationSyncDirection = z.infer<
  typeof integrationSyncDirectionSchema
>;

export const integrationReadinessSchema = z.enum([
  "NEEDS_CREDENTIALS",
  "NEEDS_CONFIGURATION",
  "NEEDS_REMOTE_VERIFICATION",
  "VERIFIED",
]);

export const integrationResourceMappingSchema = z.object({
  resourceType: z.string().trim().min(1).max(80),
  localResourceId: z.string().trim().min(1).max(160),
  externalResourceId: z.string().trim().min(1).max(240),
});
export type IntegrationResourceMapping = z.infer<
  typeof integrationResourceMappingSchema
>;

const integrationConfigBaseSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  inheritToLocations: z.boolean().default(false),
  syncDirection: integrationSyncDirectionSchema.default("INBOUND"),
  syncCursor: z.string().trim().max(2048).nullable().default(null),
  resourceMappings: z
    .array(integrationResourceMappingSchema)
    .max(100)
    .default([]),
  readiness: integrationReadinessSchema.default("NEEDS_REMOTE_VERIFICATION"),
});

const nullableSetting = z.string().trim().min(1).max(240).nullable().default(null);

export const integrationProviderConfigSchema = z.discriminatedUnion("provider", [
  integrationConfigBaseSchema.extend({
    provider: z.literal("CLASSPASS"),
    family: z.literal("MARKETPLACE"),
    partnerId: nullableSetting,
  }),
  integrationConfigBaseSchema.extend({
    provider: z.literal("WELLHUB"),
    family: z.literal("MARKETPLACE"),
    gymId: nullableSetting,
  }),
  integrationConfigBaseSchema.extend({
    provider: z.literal("KISI"),
    family: z.literal("ACCESS_CONTROL"),
    placeId: nullableSetting,
  }),
  integrationConfigBaseSchema.extend({
    provider: z.literal("MAILCHIMP"),
    family: z.literal("MARKETING_SYNC"),
    audienceId: nullableSetting,
    serverPrefix: z
      .string()
      .trim()
      .regex(/^us\d{1,3}$/)
      .nullable()
      .default(null),
  }),
  integrationConfigBaseSchema.extend({
    provider: z.literal("ZOOM"),
    family: z.literal("VIDEO_MEETING"),
    hostEmail: z.string().email().nullable().default(null),
  }),
  integrationConfigBaseSchema.extend({
    provider: z.literal("SPIVI"),
    family: z.literal("FITNESS_DISPLAY"),
    studioId: nullableSetting,
  }),
]);
export type IntegrationProviderConfig = z.infer<
  typeof integrationProviderConfigSchema
>;

const apiKeySecretSchema = z.object({
  apiKey: z.string().trim().min(1).max(8192),
  webhookSecret: z.string().trim().min(1).max(4096).nullable().default(null),
});

export const integrationProviderSecretSchema = z.discriminatedUnion("provider", [
  apiKeySecretSchema.extend({ provider: z.literal("CLASSPASS") }),
  apiKeySecretSchema.extend({ provider: z.literal("WELLHUB") }),
  apiKeySecretSchema.extend({ provider: z.literal("KISI") }),
  apiKeySecretSchema.extend({ provider: z.literal("MAILCHIMP") }),
  z.object({
    provider: z.literal("ZOOM"),
    accountId: z.string().trim().min(1).max(240),
    clientId: z.string().trim().min(1).max(240),
    clientSecret: z.string().trim().min(1).max(8192),
    webhookSecret: z.string().trim().min(1).max(4096).nullable().default(null),
  }),
  apiKeySecretSchema.extend({ provider: z.literal("SPIVI") }),
]);
export type IntegrationProviderSecret = z.infer<
  typeof integrationProviderSecretSchema
>;
