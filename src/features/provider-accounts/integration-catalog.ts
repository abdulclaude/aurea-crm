import {
  type IntegrationProvider,
  integrationProviderConfigSchema,
  type IntegrationProviderConfig,
  type IntegrationProviderFamily,
  integrationProviderSecretSchema,
  type IntegrationProviderSecret,
  type IntegrationSyncDirection,
} from "@/features/provider-accounts/contracts";

export type IntegrationProviderDefinition = {
  provider: IntegrationProvider;
  family: IntegrationProviderFamily;
  label: string;
  description: string;
  capabilities: string[];
  defaultSyncDirection: IntegrationSyncDirection;
  settingFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
  }>;
  credentialFields: Array<{
    key: string;
    label: string;
    placeholder: string;
  }>;
};

export const integrationProviderCatalog: IntegrationProviderDefinition[] = [
  {
    provider: "CLASSPASS",
    family: "MARKETPLACE",
    label: "ClassPass",
    description: "Synchronize marketplace availability and bookings.",
    capabilities: ["marketplace.availability.sync", "marketplace.bookings.read"],
    defaultSyncDirection: "BIDIRECTIONAL",
    settingFields: [{ key: "partnerId", label: "Partner ID", placeholder: "Partner ID", required: true }],
    credentialFields: [{ key: "apiKey", label: "API key", placeholder: "ClassPass API key" }],
  },
  {
    provider: "WELLHUB",
    family: "MARKETPLACE",
    label: "Wellhub",
    description: "Synchronize gym inventory, availability, and bookings.",
    capabilities: ["marketplace.availability.sync", "marketplace.bookings.read"],
    defaultSyncDirection: "BIDIRECTIONAL",
    settingFields: [{ key: "gymId", label: "Gym ID", placeholder: "Wellhub gym ID", required: true }],
    credentialFields: [{ key: "apiKey", label: "API key", placeholder: "Wellhub API key" }],
  },
  {
    provider: "KISI",
    family: "ACCESS_CONTROL",
    label: "Kisi",
    description: "Manage access grants and inspect door events.",
    capabilities: ["access_control.grants.manage", "access_control.events.read"],
    defaultSyncDirection: "BIDIRECTIONAL",
    settingFields: [{ key: "placeId", label: "Place ID", placeholder: "Kisi place ID", required: true }],
    credentialFields: [{ key: "apiKey", label: "API token", placeholder: "Kisi API token" }],
  },
  {
    provider: "MAILCHIMP",
    family: "MARKETING_SYNC",
    label: "Mailchimp",
    description: "Synchronize consent-aware contacts with an audience.",
    capabilities: ["marketing.contacts.read", "marketing.contacts.sync"],
    defaultSyncDirection: "BIDIRECTIONAL",
    settingFields: [
      { key: "audienceId", label: "Audience ID", placeholder: "Mailchimp audience ID", required: true },
      { key: "serverPrefix", label: "Server prefix", placeholder: "us21", required: true },
    ],
    credentialFields: [{ key: "apiKey", label: "API key", placeholder: "Mailchimp API key" }],
  },
  {
    provider: "ZOOM",
    family: "VIDEO_MEETING",
    label: "Zoom",
    description: "Create and manage meetings for virtual sessions.",
    capabilities: ["video_meeting.meetings.manage"],
    defaultSyncDirection: "OUTBOUND",
    settingFields: [{ key: "hostEmail", label: "Host email", placeholder: "host@example.com", required: true }],
    credentialFields: [
      { key: "accountId", label: "Account ID", placeholder: "Zoom account ID" },
      { key: "clientId", label: "Client ID", placeholder: "Zoom client ID" },
      { key: "clientSecret", label: "Client secret", placeholder: "Zoom client secret" },
    ],
  },
  {
    provider: "SPIVI",
    family: "FITNESS_DISPLAY",
    label: "Spivi",
    description: "Synchronize class and performance display data.",
    capabilities: ["fitness.metrics.read", "fitness.display.sync"],
    defaultSyncDirection: "OUTBOUND",
    settingFields: [{ key: "studioId", label: "Studio ID", placeholder: "Spivi studio ID", required: true }],
    credentialFields: [{ key: "apiKey", label: "API key", placeholder: "Spivi API key" }],
  },
];

export function getIntegrationProviderDefinition(provider: IntegrationProvider) {
  const definition = integrationProviderCatalog.find(
    (candidate) => candidate.provider === provider,
  );
  if (!definition) {
    throw new Error(`Unsupported integration provider: ${provider}`);
  }
  return definition;
}

export function parseIntegrationProviderConfig(
  provider: IntegrationProvider,
  value: unknown,
): IntegrationProviderConfig {
  const definition = getIntegrationProviderDefinition(provider);
  return integrationProviderConfigSchema.parse({
    ...(typeof value === "object" && value !== null ? value : {}),
    provider,
    family: definition.family,
  });
}

export function parseIntegrationProviderSecret(
  provider: IntegrationProvider,
  value: unknown,
): IntegrationProviderSecret {
  return integrationProviderSecretSchema.parse({
    ...(typeof value === "object" && value !== null ? value : {}),
    provider,
  });
}
