import type { LucideIcon } from "lucide-react";

import type { Capability } from "@/features/permissions/capabilities";

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
  icon: LucideIcon;
  audience: SettingsAudience;
  requiredCapability?: Capability;
};

export type SettingsSection = {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
  items: readonly SettingsItem[];
};
