import type { Capability } from "@/features/permissions/capabilities";

import { SETTINGS_SECTIONS } from "../constants";
import type { SettingsSection, SettingsSectionId } from "../types";

export function getVisibleSettingsSections(input: {
  capabilities: readonly Capability[];
  isInstructor: boolean;
}): SettingsSection[] {
  const capabilities = new Set(input.capabilities);

  return SETTINGS_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (input.isInstructor && item.audience !== "all") return false;
      return item.requiredCapability
        ? capabilities.has(item.requiredCapability)
        : true;
    }),
  })).filter((section) => section.items.length > 0);
}

export function filterSettingsSections(input: {
  sections: readonly SettingsSection[];
  sectionId: SettingsSectionId | "all";
  query: string;
}): SettingsSection[] {
  const query = input.query.trim().toLocaleLowerCase();

  return input.sections
    .filter(
      (section) => input.sectionId === "all" || section.id === input.sectionId,
    )
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!query) return true;
        return [section.title, item.title, item.description].some((value) =>
          value.toLocaleLowerCase().includes(query),
        );
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export function getActiveSettingsItemHref(
  pathname: string,
  hrefs: readonly string[],
): string | null {
  return (
    hrefs
      .filter((href) =>
        href === "/settings"
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`),
      )
      .sort((left, right) => right.length - left.length)[0] ?? null
  );
}
