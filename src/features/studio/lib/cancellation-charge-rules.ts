export const CANCELLATION_CHARGE_STATUSES = [
  "PENDING",
  "REQUIRES_PAYMENT_METHOD",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "NO_PAYMENT_DUE",
  "WAIVED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "DISPUTED",
] as const;

export type CancellationChargeStatus =
  (typeof CANCELLATION_CHARGE_STATUSES)[number];

export function cancellationChargeCanCollect(
  status: CancellationChargeStatus,
): boolean {
  return ["PENDING", "FAILED", "REQUIRES_PAYMENT_METHOD"].includes(status);
}

export function cancellationChargeCanWaive(
  status: CancellationChargeStatus,
): boolean {
  return [
    "PENDING",
    "FAILED",
    "REQUIRES_PAYMENT_METHOD",
    "NO_PAYMENT_DUE",
  ].includes(status);
}

export function paymentIntentNeedsCustomerAction(status: string): boolean {
  return ["requires_payment_method", "requires_action", "canceled"].includes(
    status,
  );
}
