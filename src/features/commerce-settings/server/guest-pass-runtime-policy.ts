import { TRPCError } from "@trpc/server";

import type { GuestPassPolicyValues } from "@/features/commerce-settings/contracts";

type RedeemableGuestPass = {
  status: "PENDING_APPROVAL" | "ACTIVE" | "REDEEMED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  usedCount: number;
  allowedUses: number;
};

export function assertGuestPassApprovable(
  pass: Pick<RedeemableGuestPass, "status" | "expiresAt">,
  now: Date,
): void {
  if (pass.status !== "PENDING_APPROVAL") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Only pending guest passes can be approved.",
    });
  }
  if (pass.expiresAt <= now) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This guest pass expired before it was approved.",
    });
  }
}

export function buildGuestPassIssueDecision(input: {
  policyId: string;
  policyVersion: number;
  policy: GuestPassPolicyValues;
  outstandingPasses: number;
  issuedAt: Date;
}) {
  if (!input.policy.enabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Guest passes are disabled for this workspace.",
    });
  }
  if (input.outstandingPasses >= input.policy.passesPerMember) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This member has reached their guest-pass quota.",
    });
  }
  const expiresAt = new Date(input.issuedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + input.policy.validityDays);
  return {
    status: input.policy.requiresApproval
      ? ("PENDING_APPROVAL" as const)
      : ("ACTIVE" as const),
    expiresAt,
    policySnapshot: {
      policyVersionId: input.policyId,
      version: input.policyVersion,
      values: structuredClone(input.policy),
    },
  };
}

export function assertGuestPassRedeemable(
  pass: RedeemableGuestPass,
  now: Date,
): void {
  if (pass.expiresAt <= now) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This guest pass has expired.",
    });
  }
  if (pass.status !== "ACTIVE") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        pass.status === "PENDING_APPROVAL"
          ? "This guest pass still needs approval."
          : "This guest pass is not active.",
    });
  }
  if (pass.usedCount >= pass.allowedUses) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This guest pass has no remaining uses.",
    });
  }
}
