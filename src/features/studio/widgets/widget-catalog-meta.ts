import type { LucideIcon } from "lucide-react";
import {
  BadgePoundSterling,
  CalendarCheck2,
  CalendarRange,
  Gift,
  PlaySquare,
  Sparkles,
  Ticket,
  UsersRound,
} from "lucide-react";

import { WidgetType } from "@/db/enums";

export type WidgetCatalogMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
};

export const WIDGET_CATALOG_META: Record<
  (typeof WidgetType)[keyof typeof WidgetType],
  WidgetCatalogMeta
> = {
  SCHEDULE: {
    label: "Class schedule",
    description: "Display upcoming classes, availability, prices, and instructors.",
    icon: CalendarRange,
  },
  BOOKING: {
    label: "Appointment booking",
    description: "Let visitors choose an eligible appointment and continue to booking.",
    icon: CalendarCheck2,
  },
  MEMBERSHIP: {
    label: "Membership plans",
    description: "Present public membership options in a clear pricing catalogue.",
    icon: BadgePoundSterling,
  },
  INSTRUCTORS: {
    label: "Instructor gallery",
    description: "Introduce your team with public profiles and specialties.",
    icon: UsersRound,
  },
  INTRO_OFFER: {
    label: "Intro offers",
    description: "Show current introductory offers with links to published pricing.",
    icon: Sparkles,
  },
  EVENT: {
    label: "Upcoming events",
    description: "Promote public events and their next available dates.",
    icon: Ticket,
  },
  ON_DEMAND: {
    label: "On-demand videos",
    description: "Share a library of published public videos visitors can watch.",
    icon: PlaySquare,
  },
  REFERRAL: {
    label: "Referral programme",
    description: "Explain an active referral programme and its rewards.",
    icon: Gift,
  },
};
