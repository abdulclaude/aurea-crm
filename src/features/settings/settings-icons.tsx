import type { FC } from "react";
import {
  CentralIcon,
  type CentralIconProps,
} from "@central-icons-react/all";

type SettingsIconProps = Omit<
  CentralIconProps,
  "fill" | "join" | "name" | "radius" | "stroke"
>;
type SettingsIconName = CentralIconProps["name"];

export type SettingsIcon = FC<SettingsIconProps>;

function createSettingsIcon(name: SettingsIconName): SettingsIcon {
  const SettingsIcon = (props: SettingsIconProps) => (
    <CentralIcon
      {...props}
      name={name}
      join="round"
      fill="outlined"
      radius="3"
      stroke="1.5"
    />
  );
  SettingsIcon.displayName = `SettingsIcon(${name})`;
  return SettingsIcon;
}

// Swap only the catalog name assigned to a semantic role below.
export const settingsIcons = {
  sections: {
    account: createSettingsIcon("IconCirclePerson"),
    workspace: createSettingsIcon("IconBuildings"),
    publishing: createSettingsIcon("IconGlobe"),
    communications: createSettingsIcon("IconEmailSettings"),
    integrations: createSettingsIcon("IconPlugins"),
    commerce: createSettingsIcon("IconCreditCard1"),
    studio: createSettingsIcon("IconCalendarDays"),
    developer: createSettingsIcon("IconCode"),
    operations: createSettingsIcon("IconChecklist"),
  },
  items: {
    profile: createSettingsIcon("IconCirclePerson"),
    notifications: createSettingsIcon("IconBell"),
    workspaceDetails: createSettingsIcon("IconBuildings"),
    branding: createSettingsIcon("IconPaintBrush"),
    modules: createSettingsIcon("IconBlocks"),
    content: createSettingsIcon("IconBookSimple"),
    customers: createSettingsIcon("IconContacts"),
    staff: createSettingsIcon("IconUserGroup"),
    styles: createSettingsIcon("IconColorPalette"),
    publishing: createSettingsIcon("IconGlobe"),
    widgets: createSettingsIcon("IconLayoutWindow"),
    email: createSettingsIcon("IconEmailSettings"),
    sms: createSettingsIcon("IconImessage"),
    voice: createSettingsIcon("IconPhone"),
    inbox: createSettingsIcon("IconInboxEmpty"),
    rules: createSettingsIcon("IconChecklist"),
    suppressions: createSettingsIcon("IconCircleBanSign"),
    blocklist: createSettingsIcon("IconShieldCrossed"),
    usage: createSettingsIcon("IconLineChart3"),
    deliveryOperations: createSettingsIcon("IconSend"),
    integrationAccounts: createSettingsIcon("IconPlugins"),
    apps: createSettingsIcon("IconWindowApp"),
    calcom: createSettingsIcon("IconCalendarRepeat"),
    credentials: createSettingsIcon("IconKey1"),
    webhooks: createSettingsIcon("IconWebhooks"),
    paymentMethods: createSettingsIcon("IconCreditCard1"),
    bankTransfer: createSettingsIcon("IconBank"),
    recoveryPolicies: createSettingsIcon("IconShieldCheck"),
    cancellations: createSettingsIcon("IconCalendarRemove4"),
    taxSettings: createSettingsIcon("IconPercent"),
    revenueCategories: createSettingsIcon("IconTag"),
    offlinePayments: createSettingsIcon("IconWallet1"),
    documentDefaults: createSettingsIcon("IconReceiptBill"),
    guestPasses: createSettingsIcon("IconTicket"),
    schedulingPolicies: createSettingsIcon("IconCalendarClock"),
    bookingCalendar: createSettingsIcon("IconCalendarDays"),
    apiKeys: createSettingsIcon("IconKey2"),
    paymentOperations: createSettingsIcon("IconReceiptCheck"),
    recoveryOperations: createSettingsIcon("IconArrowRotateClockwise"),
    studioCommerce: createSettingsIcon("IconWallet2"),
    instructorPayouts: createSettingsIcon("IconSettingsGear3"),
  },
} as const;
