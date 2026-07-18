import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;

export type LifecycleSummary = RouterOutput["clients"]["memberLifecycle"];
export type MemberLifecycleView =
  | "overview"
  | "personal-info"
  | "households"
  | "bookings"
  | "pricing-options"
  | "payments"
  | "waivers"
  | "notes"
  | "activity"
  | "guest-passes"
  | "inbox";

export const funnelSteps = [
  ["leadCaptured", "Lead captured"],
  ["introPurchased", "Intro purchased"],
  ["firstClassBooked", "First class booked"],
  ["firstClassAttended", "First class attended"],
  ["membershipPurchased", "Membership purchased"],
  ["nextClassBooked", "Next class booked"],
  ["inactiveWinback", "Win-back needed"],
] as const;

export function labelize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
