import { z } from "zod";

export const stripeConnectAccountSchema = z
  .object({
    id: z.string().min(1),
    object: z.literal("account"),
    charges_enabled: z.boolean().optional(),
    payouts_enabled: z.boolean().optional(),
    details_submitted: z.boolean().optional(),
  })
  .passthrough();

export const stripeConnectPayoutSchema = z
  .object({
    id: z.string().min(1),
    object: z.literal("payout"),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
    status: z.string(),
  })
  .passthrough();

export function connectAccountStatus(input: {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}): {
  onboardingComplete: boolean;
  accountStatus: "active" | "pending_verification" | "pending_onboarding";
} {
  const onboardingComplete = input.chargesEnabled && input.payoutsEnabled;
  return {
    onboardingComplete,
    accountStatus: onboardingComplete
      ? "active"
      : input.detailsSubmitted
        ? "pending_verification"
        : "pending_onboarding",
  };
}

export function connectPayoutLedgerStatus(
  status: string,
): "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" {
  if (status === "paid") return "SUCCEEDED";
  if (status === "failed") return "FAILED";
  if (status === "canceled") return "CANCELLED";
  return "PENDING";
}
