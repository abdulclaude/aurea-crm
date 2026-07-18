import {
  type IntegrationProvider,
  type IntegrationProviderConfig,
  type IntegrationProviderSecret,
  type IntegrationResourceMapping,
  type IntegrationSyncDirection,
} from "@/features/provider-accounts/contracts";
import {
  getIntegrationProviderDefinition,
  parseIntegrationProviderConfig,
  parseIntegrationProviderSecret,
} from "@/features/provider-accounts/integration-catalog";

export type IntegrationAccountScope = {
  organizationId: string;
  locationId: string | null;
};

export type IntegrationAccountCandidate = IntegrationAccountScope & {
  config: IntegrationProviderConfig;
};

export type IntegrationDraft = {
  provider: IntegrationProvider;
  inheritToLocations: boolean;
  syncDirection: IntegrationSyncDirection;
  syncCursor: string | null;
  resourceMappings: IntegrationResourceMapping[];
  settings: Record<string, string>;
  credentials?: Record<string, string>;
  hasStoredSecret: boolean;
};

export type IntegrationDraftValidation = {
  valid: boolean;
  canAttemptRemoteCheck: boolean;
  readiness:
    | "NEEDS_CREDENTIALS"
    | "NEEDS_CONFIGURATION"
    | "NEEDS_REMOTE_VERIFICATION";
  issues: string[];
  config: IntegrationProviderConfig | null;
  secret: IntegrationProviderSecret | null;
};

export function integrationAccountMatchesScope(
  candidate: IntegrationAccountCandidate,
  scope: IntegrationAccountScope,
): boolean {
  if (candidate.organizationId !== scope.organizationId) return false;
  if (candidate.locationId === scope.locationId) return true;
  return Boolean(
    scope.locationId &&
      candidate.locationId === null &&
      candidate.config.inheritToLocations,
  );
}

export function buildIntegrationProviderConfig(
  draft: Omit<IntegrationDraft, "credentials" | "hasStoredSecret">,
): IntegrationProviderConfig {
  const definition = getIntegrationProviderDefinition(draft.provider);
  const providerSettings = Object.fromEntries(
    definition.settingFields.map((field) => [
      field.key,
      draft.settings[field.key]?.trim() || null,
    ]),
  );

  return parseIntegrationProviderConfig(draft.provider, {
    ...providerSettings,
    inheritToLocations: draft.inheritToLocations,
    syncDirection: draft.syncDirection,
    syncCursor: draft.syncCursor?.trim() || null,
    resourceMappings: draft.resourceMappings,
    readiness: "NEEDS_REMOTE_VERIFICATION",
  });
}

export function validateIntegrationDraft(
  draft: IntegrationDraft,
): IntegrationDraftValidation {
  const issues: string[] = [];
  let config: IntegrationProviderConfig | null = null;
  let secret: IntegrationProviderSecret | null = null;

  try {
    config = buildIntegrationProviderConfig(draft);
  } catch {
    issues.push("Provider configuration is invalid.");
  }

  if (draft.credentials) {
    try {
      secret = parseIntegrationProviderSecret(draft.provider, {
        ...draft.credentials,
        webhookSecret: draft.credentials.webhookSecret || null,
      });
    } catch {
      issues.push("Provider credentials are incomplete or invalid.");
    }
  } else if (!draft.hasStoredSecret) {
    issues.push("Provider credentials are required.");
  }

  const needsConfiguration = Boolean(
    config &&
      getIntegrationProviderDefinition(draft.provider).settingFields.some(
        (field) =>
          field.required && !draft.settings[field.key]?.trim(),
      ),
  );
  if (needsConfiguration) {
    issues.push("Required provider configuration is missing.");
  }

  const readiness =
    !secret && !draft.hasStoredSecret
      ? "NEEDS_CREDENTIALS"
      : needsConfiguration || !config
        ? "NEEDS_CONFIGURATION"
        : "NEEDS_REMOTE_VERIFICATION";

  return {
    valid: issues.length === 0,
    canAttemptRemoteCheck: issues.length === 0,
    readiness,
    issues,
    config,
    secret,
  };
}
