import type { FC } from "react";
import {
  CentralIcon,
  type CentralIconProps,
} from "@central-icons-react/all";

type SidebarIconProps = Omit<
  CentralIconProps,
  "fill" | "join" | "name" | "radius" | "stroke"
>;
type SidebarIconName = CentralIconProps["name"];

function createSidebarIcon(name: SidebarIconName): FC<SidebarIconProps> {
  const SidebarIcon = (props: SidebarIconProps) => (
    <CentralIcon
      {...props}
      name={name}
      join="round"
      fill="outlined"
      radius="3"
      stroke="1.5"
    />
  );
  SidebarIcon.displayName = `SidebarIcon(${name})`;
  return SidebarIcon;
}

// Swap only the catalog name assigned to a semantic role below.
export const sidebarIcons = {
  navigation: {
    dashboard: createSidebarIcon("IconHomeLine"),
    inbox: createSidebarIcon("IconInboxEmpty"),
    team: createSidebarIcon("IconUserGroup"),
    reports: createSidebarIcon("IconCodeAnalyze"),
    settings: createSidebarIcon("IconSettingsGear3"),
    favorite: createSidebarIcon("IconStar"),
    expandGroup: createSidebarIcon("IconChevronDownMedium"),
    collapseCard: createSidebarIcon("IconMinusMedium"),
    expandCard: createSidebarIcon("IconPlusMedium"),
    completeStep: createSidebarIcon("IconCircleCheck"),
    stepCheck: createSidebarIcon("IconCheckmark1Small"),
    help: createSidebarIcon("IconCircleQuestionmark"),
    resources: createSidebarIcon("IconGlobe"),
    external: createSidebarIcon("IconArrowUpRight"),
  },
  groups: {
    home: createSidebarIcon("IconHomeLine"),
    classes: createSidebarIcon("IconCalendar3"),
    earnings: createSidebarIcon("IconBanknote1"),
    scheduleBooking: createSidebarIcon("IconCalendarClock"),
    people: createSidebarIcon("IconPeopleCopy"),
    revenue: createSidebarIcon("IconCoinStack"),
    marketing: createSidebarIcon("IconPaperPlaneTopRight"),
    automations: createSidebarIcon("IconZap"),
  },
  items: {
    schedule: createSidebarIcon("IconCalendarDays"),
    classes: createSidebarIcon("IconCalendar3"),
    subRequests: createSidebarIcon("IconArrowsRepeatRightLeft"),
    earnings: createSidebarIcon("IconBanknote1"),
    timeLogs: createSidebarIcon("IconCalendarClock4"),
    checkIn: createSidebarIcon("IconCalendarCheck"),
    scheduleSetup: createSidebarIcon("IconSettingsSliderThree"),
    members: createSidebarIcon("IconPeople"),
    waivers: createSidebarIcon("IconSignature"),
    revenueOverview: createSidebarIcon("IconLineChart3"),
    pricingOptions: createSidebarIcon("IconTag"),
    invoices: createSidebarIcon("IconReceiptBill"),
    productsPos: createSidebarIcon("IconPackage"),
    creditsPromotions: createSidebarIcon("IconGiftcard"),
    campaigns: createSidebarIcon("IconMegaphone"),
    growthTools: createSidebarIcon("IconGrowth"),
    forms: createSidebarIcon("IconInputForm"),
    workflows: createSidebarIcon("IconBranch"),
    executions: createSidebarIcon("IconHistory"),
    routeChecklist: createSidebarIcon("IconSquareChecklist"),
    documentation: createSidebarIcon("IconBookSimple"),
    reportBug: createSidebarIcon("IconBug"),
    suggestFeature: createSidebarIcon("IconLightBulb"),
    support: createSidebarIcon("IconRescueRing"),
    customizeSidebar: createSidebarIcon("IconSidebar"),
  },
} as const;
