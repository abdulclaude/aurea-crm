const CANCELLABLE_PAYMENT_INTENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
] as const;

export function cancellationPaymentIntentCanBeCancelled(
  status: string,
): boolean {
  return CANCELLABLE_PAYMENT_INTENT_STATUSES.some(
    (candidate) => candidate === status,
  );
}
