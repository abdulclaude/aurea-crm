export type CommerceLedgerKeyKind =
  | "PAYMENT"
  | "REFUND"
  | "DISPUTE"
  | "PAYOUT"
  | "CREDIT"
  | "ADJUSTMENT";

export function commerceLedgerIdempotencyKey(input: {
  provider: string;
  providerAccountId?: string | null;
  kind: CommerceLedgerKeyKind;
  providerObjectId: string;
}): string {
  const account = input.providerAccountId?.trim() || "platform";
  return [
    input.provider.trim().toLowerCase(),
    account.toLowerCase(),
    input.kind.toLowerCase(),
    input.providerObjectId.trim(),
  ].join(":");
}
