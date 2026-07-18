import {
  workspaceCurrencySchema,
  workspaceTimezoneSchema,
  type RequiredWorkspaceRegionalValues,
  type WorkspaceRegionalValues,
} from "../contracts";

export const SYSTEM_REGIONAL_DEFAULTS = {
  timezone: "UTC",
  locale: "en-US",
  currency: "USD",
  weekStart: "MONDAY",
  dateFormat: "LOCALE",
  timeFormat: "TWELVE_HOUR",
} as const satisfies RequiredWorkspaceRegionalValues;

export type RegionalValueSource =
  | "LOCATION_OVERRIDE"
  | "ORGANIZATION_DEFAULT"
  | "LEGACY_LOCATION"
  | "LEGACY_ORGANIZATION"
  | "SYSTEM_DEFAULT";

export type ResolvedRegionalField<T> = {
  value: T;
  source: RegionalValueSource;
};

export type ResolvedWorkspaceRegionalSettings = {
  [Key in keyof RequiredWorkspaceRegionalValues]: ResolvedRegionalField<
    RequiredWorkspaceRegionalValues[Key]
  >;
};

function resolveOrganizationField<Key extends keyof RequiredWorkspaceRegionalValues>(
  key: Key,
  organizationValues: WorkspaceRegionalValues | null,
  legacyOrganizationCurrency: string | null,
): ResolvedRegionalField<RequiredWorkspaceRegionalValues[Key]> {
  const configured = organizationValues?.[key];
  if (configured !== null && configured !== undefined) {
    return {
      value: configured as RequiredWorkspaceRegionalValues[Key],
      source: "ORGANIZATION_DEFAULT",
    };
  }
  if (key === "currency" && legacyOrganizationCurrency) {
    const legacy = workspaceCurrencySchema.safeParse(legacyOrganizationCurrency);
    if (legacy.success) {
      return {
        value: legacy.data as RequiredWorkspaceRegionalValues[Key],
        source: "LEGACY_ORGANIZATION",
      };
    }
  }
  return {
    value: SYSTEM_REGIONAL_DEFAULTS[key],
    source: "SYSTEM_DEFAULT",
  };
}

export function resolveWorkspaceRegionalSettings(input: {
  organizationValues: WorkspaceRegionalValues | null;
  locationValues: WorkspaceRegionalValues | null;
  hasLocationScope: boolean;
  legacyOrganizationCurrency: string | null;
  legacyLocationTimezone: string | null;
}): ResolvedWorkspaceRegionalSettings {
  const keys = Object.keys(
    SYSTEM_REGIONAL_DEFAULTS,
  ) as Array<keyof RequiredWorkspaceRegionalValues>;

  return Object.fromEntries(
    keys.map((key) => {
      const organizationField = resolveOrganizationField(
        key,
        input.organizationValues,
        input.legacyOrganizationCurrency,
      );
      if (!input.hasLocationScope) return [key, organizationField];

      const override = input.locationValues?.[key];
      if (override !== null && override !== undefined) {
        return [key, { value: override, source: "LOCATION_OVERRIDE" }];
      }
      if (
        !input.locationValues &&
        key === "timezone" &&
        input.legacyLocationTimezone &&
        input.legacyLocationTimezone !== "UTC"
      ) {
        const legacy = workspaceTimezoneSchema.safeParse(
          input.legacyLocationTimezone,
        );
        if (legacy.success) {
          return [
            key,
            { value: legacy.data, source: "LEGACY_LOCATION" },
          ];
        }
      }
      return [key, organizationField];
    }),
  ) as ResolvedWorkspaceRegionalSettings;
}

export function resolvedRegionalValues(
  settings: ResolvedWorkspaceRegionalSettings,
): RequiredWorkspaceRegionalValues {
  return {
    timezone: settings.timezone.value,
    locale: settings.locale.value,
    currency: settings.currency.value,
    weekStart: settings.weekStart.value,
    dateFormat: settings.dateFormat.value,
    timeFormat: settings.timeFormat.value,
  };
}
