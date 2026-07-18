import type {
  BookingWindowPolicyView,
  SchedulingPolicyHistoryView,
  SchedulingPolicyListView,
  SchedulingPolicyServiceView,
  WaitlistPolicyView,
} from "@/features/studio/scheduling/contracts";

export type SchedulingPolicyList = SchedulingPolicyListView;
export type BookingWindowPolicy = BookingWindowPolicyView;
export type WaitlistPolicy = WaitlistPolicyView;
export type SchedulingPolicy = BookingWindowPolicy | WaitlistPolicy;
export type SchedulingService = SchedulingPolicyServiceView;
export type SchedulingPolicyKind = SchedulingPolicy["kind"];
export type SchedulingPolicyHistory = SchedulingPolicyHistoryView;

export type PolicyEditorMode = "CREATE" | "VERSION" | "CLONE";
