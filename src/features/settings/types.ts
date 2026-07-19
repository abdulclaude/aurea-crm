import type { Capability } from "@/features/permissions/capabilities";

import type { SettingsIcon } from "./settings-icons";

export type SettingsAudience = "all" | "operators";

export type SettingsSectionId =
  | "account"
  | "workspace"
  | "publishing"
  | "communications"
  | "integrations"
  | "commerce"
  | "studio"
  | "developer"
  | "operations";

export type SettingsItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: SettingsIcon;
  audience: SettingsAudience;
  requiredCapability?: Capability;
};

export type SettingsSection = {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: SettingsIcon;
  items: readonly SettingsItem[];
};
