import type {
  RequiredWorkspaceOperationsValues,
  WorkspaceOperationsValues,
} from "../operations-contracts";

const ALL_DAY = [{ opensAtMinutes: 0, closesAtMinutes: 1440 }];

export const SYSTEM_OPERATIONS_DEFAULTS = {
  businessHours: {
    MONDAY: ALL_DAY,
    TUESDAY: ALL_DAY,
    WEDNESDAY: ALL_DAY,
    THURSDAY: ALL_DAY,
    FRIDAY: ALL_DAY,
    SATURDAY: ALL_DAY,
    SUNDAY: ALL_DAY,
  },
  scheduleStartMinutes: 7 * 60,
  scheduleEndMinutes: 22 * 60,
  scheduleSlotMinutes: 30,
  guestBookingEnabled: true,
  maxGuestsPerBooking: 20,
  guestRequiredFields: ["EMAIL"],
  showPublicEmail: false,
  showPublicPhone: false,
  showPublicWebsite: false,
  showPublicAddress: false,
} as const satisfies RequiredWorkspaceOperationsValues;

export type OperationsValueSource =
  | "LOCATION_OVERRIDE"
  | "ORGANIZATION_DEFAULT"
  | "SYSTEM_DEFAULT";

export type ResolvedOperationsField<T> = {
  value: T;
  source: OperationsValueSource;
};

export type ResolvedWorkspaceOperationsSettings = {
  [Key in keyof RequiredWorkspaceOperationsValues]: ResolvedOperationsField<
    RequiredWorkspaceOperationsValues[Key]
  >;
};

export function resolveWorkspaceOperationsSettings(input: {
  organizationValues: WorkspaceOperationsValues | null;
  locationValues: WorkspaceOperationsValues | null;
  hasLocationScope: boolean;
}): ResolvedWorkspaceOperationsSettings {
  const keys = Object.keys(
    SYSTEM_OPERATIONS_DEFAULTS,
  ) as Array<keyof RequiredWorkspaceOperationsValues>;

  return Object.fromEntries(
    keys.map((key) => {
      const organizationValue = input.organizationValues?.[key];
      const organizationField = {
        value:
          organizationValue === null || organizationValue === undefined
            ? SYSTEM_OPERATIONS_DEFAULTS[key]
            : organizationValue,
        source:
          organizationValue === null || organizationValue === undefined
            ? "SYSTEM_DEFAULT"
            : "ORGANIZATION_DEFAULT",
      } as ResolvedWorkspaceOperationsSettings[typeof key];

      if (!input.hasLocationScope) return [key, organizationField];
      const locationValue = input.locationValues?.[key];
      return [
        key,
        locationValue === null || locationValue === undefined
          ? organizationField
          : { value: locationValue, source: "LOCATION_OVERRIDE" },
      ];
    }),
  ) as ResolvedWorkspaceOperationsSettings;
}

export function resolvedOperationsValues(
  settings: ResolvedWorkspaceOperationsSettings,
): RequiredWorkspaceOperationsValues {
  return {
    businessHours: settings.businessHours.value,
    scheduleStartMinutes: settings.scheduleStartMinutes.value,
    scheduleEndMinutes: settings.scheduleEndMinutes.value,
    scheduleSlotMinutes: settings.scheduleSlotMinutes.value,
    guestBookingEnabled: settings.guestBookingEnabled.value,
    maxGuestsPerBooking: settings.maxGuestsPerBooking.value,
    guestRequiredFields: settings.guestRequiredFields.value,
    showPublicEmail: settings.showPublicEmail.value,
    showPublicPhone: settings.showPublicPhone.value,
    showPublicWebsite: settings.showPublicWebsite.value,
    showPublicAddress: settings.showPublicAddress.value,
  };
}
