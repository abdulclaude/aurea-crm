export type NotificationPreferenceMap = Record<string, boolean>;

export function normalizeNotificationPreferences(
  value: unknown,
): NotificationPreferenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const preferences: NotificationPreferenceMap = {};
  for (const [key, enabled] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof enabled === "boolean") preferences[key] = enabled;
  }
  return preferences;
}

export function isNotificationEventEnabled(
  preferences: NotificationPreferenceMap,
  eventType: string,
): boolean {
  return preferences[eventType] ?? true;
}
