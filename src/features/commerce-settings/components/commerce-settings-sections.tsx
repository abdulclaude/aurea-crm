"use client";

import * as React from "react";
import { toast } from "sonner";

import { DocumentDefaultsSettingsSection } from "./document-defaults-settings-section";
import { GuestPassSettingsSection } from "./guest-pass-settings-section";
import { OfflinePaymentSettingsSection } from "./offline-payment-settings-section";
import { RevenueSettingsSection } from "./revenue-settings-section";
import { TaxSettingsSection } from "./tax-settings-section";
import type {
  CommerceSettings,
  CommerceSettingsSubmit,
} from "./commerce-settings-types";
import type { CommerceSettingsTab } from "./commerce-settings-tabs";

type Props = {
  activeTab: CommerceSettingsTab;
  settings: CommerceSettings;
  canManage: boolean;
  onRefresh: () => Promise<void>;
};

export function CommerceSettingsSections({
  activeTab,
  settings,
  canManage,
  onRefresh,
}: Props): React.JSX.Element {
  const submit: CommerceSettingsSubmit = async (work, success) => {
    try {
      await work();
      toast.success(success);
      await onRefresh();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Commerce settings could not be saved",
      );
      return false;
    }
  };
  const sectionProps = { activeTab, settings, canManage, submit };

  return (
    <>
      <TaxSettingsSection {...sectionProps} />
      <RevenueSettingsSection {...sectionProps} />
      <OfflinePaymentSettingsSection {...sectionProps} />
      <DocumentDefaultsSettingsSection {...sectionProps} />
      <GuestPassSettingsSection {...sectionProps} />
    </>
  );
}
