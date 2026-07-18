import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

import type { CommerceSettingsTab } from "./commerce-settings-tabs";

export type CommerceSettings =
  inferRouterOutputs<AppRouter>["commerceSettings"]["get"];

export type CommerceSettingsSectionProps = {
  activeTab: CommerceSettingsTab;
  settings: CommerceSettings;
  canManage: boolean;
  submit: CommerceSettingsSubmit;
};

export type CommerceSettingsSubmit = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<boolean>;
