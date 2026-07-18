export const COMMERCE_SETTINGS_TABS = [
  { id: "tax", label: "Tax" },
  { id: "revenue", label: "Revenue" },
  { id: "payments", label: "Offline payments" },
  { id: "documents", label: "Documents" },
  { id: "guest-passes", label: "Guest passes" },
] as const;

export type CommerceSettingsTab = (typeof COMMERCE_SETTINGS_TABS)[number]["id"];

export function isCommerceSettingsTab(
  value: string,
): value is CommerceSettingsTab {
  return COMMERCE_SETTINGS_TABS.some((tab) => tab.id === value);
}
