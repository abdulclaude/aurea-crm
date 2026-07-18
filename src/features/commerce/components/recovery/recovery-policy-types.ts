import type {
  RecoveryActionType,
  RecoveryTarget,
} from "@/features/commerce/recovery-contracts";

export type RecoveryPolicyEditorValue = {
  target: RecoveryTarget;
  mode: "INHERIT" | "ENABLED" | "DISABLED";
  name: string;
  gracePeriodDays: number;
  maxActions: number;
  schedule: Array<{ day: number; type: RecoveryActionType }>;
};

export const TARGET_LABELS: Record<RecoveryTarget, string> = {
  INVOICE: "Invoices",
  MEMBERSHIP: "Memberships",
  BOOKING: "Bookings",
};

export const ACTION_LABELS: Record<RecoveryActionType, string> = {
  SEND_EMAIL: "Send email",
  SEND_SMS: "Send SMS",
  GRACE_PERIOD_END: "End grace period",
  ESCALATE: "Escalate to staff",
  EXPIRE_BOOKING: "Expire booking",
  RELEASE_BOOKING: "Release booking",
  RETRY_PAYMENT: "Request payment retry",
  CREATE_TASK: "Create task",
  DISPATCH_WORKFLOW: "Run workflow",
};

export function defaultRecoveryPolicy(
  target: RecoveryTarget,
  canInherit: boolean,
): RecoveryPolicyEditorValue {
  return {
    target,
    mode: canInherit ? "INHERIT" : "ENABLED",
    name: `${TARGET_LABELS[target]} recovery`,
    gracePeriodDays: target === "MEMBERSHIP" ? 3 : 0,
    maxActions: 5,
    schedule:
      target === "BOOKING"
        ? [
            { day: 0, type: "SEND_EMAIL" },
            { day: 1, type: "RELEASE_BOOKING" },
          ]
        : [
            { day: 0, type: "SEND_EMAIL" },
            { day: 3, type: "SEND_EMAIL" },
            { day: 7, type: "ESCALATE" },
          ],
  };
}
