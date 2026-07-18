export const DAY = 86_400_000;
export const DEMO_FINANCE_PROVIDER = "AUREA_DEMO";

export const PAYMENT_STATUSES = [
  ...Array(27).fill("SUCCEEDED"),
  "PARTIALLY_REFUNDED",
  "PARTIALLY_REFUNDED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "REFUNDED",
  "PENDING",
  "PENDING",
  "PENDING",
  "FAILED",
  "FAILED",
  "CANCELLED",
  "DISPUTED",
  "LOST",
] as const;

export const INVOICE_STATUSES = [
  ...Array(8).fill("DRAFT"),
  ...Array(7).fill("SENT"),
  ...Array(5).fill("VIEWED"),
  ...Array(12).fill("PAID"),
  ...Array(7).fill("PARTIALLY_PAID"),
  ...Array(7).fill("OVERDUE"),
  "CANCELLED",
  "CANCELLED",
] as const;

export const PAYMENT_TYPES = [
  "MEMBERSHIP",
  "CLASS_PACK",
  "DROP_IN",
  "GIFT_CARD",
  "POS",
  "ACCOUNT_CREDIT",
] as const;

export const RECONCILIATION_ISSUE_TYPES = [
  "MISSING_PROVIDER_RECORD",
  "MISSING_LOCAL_RECORD",
  "AMOUNT_MISMATCH",
  "CURRENCY_MISMATCH",
  "STATUS_MISMATCH",
  "DUPLICATE_RECORD",
  "ORPHANED_REFERENCE",
] as const;
