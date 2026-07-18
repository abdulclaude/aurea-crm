export type ReportLedgerKind = "PAYMENT" | "REFUND";

export type ReportLedgerStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "DISPUTED"
  | "WON"
  | "LOST"
  | "CANCELLED";

const FINAL_PAYMENT_STATUSES: ReadonlySet<ReportLedgerStatus> = new Set([
  "SUCCEEDED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

const REJECTED_TRANSACTION_STATUSES: ReadonlySet<ReportLedgerStatus> = new Set([
  "FAILED",
  "CANCELLED",
]);

export function isLedgerEntryVisibleInTransactionReport(input: {
  reportId: string;
  kind: ReportLedgerKind;
  status: ReportLedgerStatus;
}): boolean {
  if (input.reportId === "pending-transactions") {
    return input.status === "PENDING";
  }
  if (input.reportId === "voided-rejected-transactions") {
    return REJECTED_TRANSACTION_STATUSES.has(input.status);
  }
  if (input.reportId !== "transactions") return false;

  return input.kind === "REFUND"
    ? input.status === "SUCCEEDED"
    : FINAL_PAYMENT_STATUSES.has(input.status);
}

export function reportLedgerStatus(input: {
  kind: ReportLedgerKind;
  status: ReportLedgerStatus;
}): ReportLedgerStatus {
  return input.kind === "REFUND" && input.status === "SUCCEEDED"
    ? "REFUNDED"
    : input.status;
}

export function resolveReportCurrency(
  recordCurrency: string | null | undefined,
  fallbackCurrency: string,
): string {
  const record = normalizeCurrencyCode(recordCurrency);
  if (record) return record;

  const fallback = normalizeCurrencyCode(fallbackCurrency);
  if (!fallback) {
    throw new Error("Report currency must be a three-letter ISO code");
  }
  return fallback;
}

function normalizeCurrencyCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}
