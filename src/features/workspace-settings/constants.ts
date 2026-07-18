import type { WorkspaceRegionalValues } from "./contracts";
import type { WorkspaceOperationsValues } from "./operations-contracts";

export const WORKSPACE_SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "regional", label: "Regional defaults" },
  { id: "operations", label: "Hours and guests" },
  { id: "history", label: "Version history" },
] as const;

export type WorkspaceSettingsTab = (typeof WORKSPACE_SETTINGS_TABS)[number]["id"];

export const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "fr-CA", label: "French (Canada)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "it-IT", label: "Italian (Italy)" },
  { value: "nl-NL", label: "Dutch (Netherlands)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "ar-AE", label: "Arabic (United Arab Emirates)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
] as const;

export const WEEK_START_OPTIONS = [
  { value: "SUNDAY", label: "Sunday" },
  { value: "MONDAY", label: "Monday" },
  { value: "SATURDAY", label: "Saturday" },
] as const;

export const DATE_FORMAT_OPTIONS = [
  { value: "LOCALE", label: "Locale default" },
  { value: "MONTH_DAY_YEAR", label: "Month / day / year" },
  { value: "DAY_MONTH_YEAR", label: "Day / month / year" },
  { value: "YEAR_MONTH_DAY", label: "Year / month / day" },
] as const;

export const TIME_FORMAT_OPTIONS = [
  { value: "TWELVE_HOUR", label: "12-hour clock" },
  { value: "TWENTY_FOUR_HOUR", label: "24-hour clock" },
] as const;

export const EMPTY_LOCATION_OVERRIDES = {
  timezone: null,
  locale: null,
  currency: null,
  weekStart: null,
  dateFormat: null,
  timeFormat: null,
} as const satisfies WorkspaceRegionalValues;

export const EMPTY_OPERATIONS_LOCATION_OVERRIDES = {
  businessHours: null,
  scheduleStartMinutes: null,
  scheduleEndMinutes: null,
  scheduleSlotMinutes: null,
  guestBookingEnabled: null,
  maxGuestsPerBooking: null,
  guestRequiredFields: null,
  showPublicEmail: null,
  showPublicPhone: null,
  showPublicWebsite: null,
  showPublicAddress: null,
} as const satisfies WorkspaceOperationsValues;
