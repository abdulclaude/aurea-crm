import type { MetricContract } from "./contracts";

export const METRIC_CONTRACTS = [
  {
    id: "net_collected_revenue",
    name: "Net collected revenue",
    description: "Provider-backed successful payments less successful refunds.",
    decision:
      "Understand cash collected without mixing unsettled or failed payments.",
    unit: "MONEY",
    grain: "One immutable commerce ledger entry.",
    sourceOfTruth: "CommerceLedgerEntry",
    eligibility: "PAYMENT and REFUND entries in a financially final status.",
    timestampField: "CommerceLedgerEntry.occurredAt",
    timezonePolicy:
      "Bucket occurredAt in the active location timezone; fall back to UTC.",
    currencyPolicy:
      "Group by ISO currency and exponent. No implicit FX conversion.",
    refundPolicy:
      "Subtract successful refund entries in their original currency.",
    deduplicationKey: "CommerceLedgerEntry.idempotencyKey",
    lateDataPolicy:
      "Recompute affected periods when verified provider receipts arrive late.",
    dimensions: [
      "currency",
      "provider",
      "payment method",
      "location",
      "offering",
    ],
    reportIds: ["transactions"],
  },
  {
    id: "successful_payment_count",
    name: "Successful payment count",
    description:
      "Distinct provider-backed payment entries that reached a successful state.",
    decision: "Compare transaction volume independently from payment value.",
    unit: "COUNT",
    grain: "One commerce payment ledger entry.",
    sourceOfTruth: "CommerceLedgerEntry",
    eligibility:
      "PAYMENT entries with status SUCCEEDED, PARTIALLY_REFUNDED, or REFUNDED.",
    timestampField: "CommerceLedgerEntry.occurredAt",
    timezonePolicy:
      "Bucket occurredAt in the active location timezone; fall back to UTC.",
    currencyPolicy: "Currency is a dimension, not a conversion input.",
    refundPolicy:
      "Refunds do not reduce payment count; expose refund count separately.",
    deduplicationKey: "CommerceLedgerEntry.idempotencyKey",
    lateDataPolicy: "Verified provider events may update historical periods.",
    dimensions: ["provider", "status", "currency", "location"],
    reportIds: ["transactions"],
  },
  {
    id: "recorded_attendance_count",
    name: "Recorded attendance",
    description: "Check-ins recorded against each class instance.",
    decision: "Compare recorded attendance across schedule slots.",
    unit: "COUNT",
    grain: "One class instance in the active location.",
    sourceOfTruth: "StudioClass joined to StudioCheckIn",
    eligibility:
      "All class instances in the bounded result; class status remains visible for filtering.",
    timestampField: "StudioClass.startTime",
    timezonePolicy:
      "Use the active location timezone for service-day boundaries.",
    currencyPolicy: "Not applicable.",
    refundPolicy: "Not applicable.",
    deduplicationKey:
      "Unique check-in identity per booking and class instance.",
    lateDataPolicy:
      "Late check-ins update the service day until the class is closed.",
    dimensions: ["class", "service type", "instructor", "location"],
    reportIds: ["attendance-analysis"],
  },
  {
    id: "membership_records",
    name: "Membership records",
    description: "Memberships and their explicit current status.",
    decision:
      "Inspect the retained base without silently excluding paused or cancelled records.",
    unit: "COUNT",
    grain: "One studio membership.",
    sourceOfTruth: "StudioMembership",
    eligibility:
      "All memberships in the active location; use the status field for an explicit cohort.",
    timestampField: "Reporting boundary in the active location timezone.",
    timezonePolicy: "Evaluate effective dates in the active location timezone.",
    currencyPolicy:
      "Membership count is currency independent; MRR must remain currency-partitioned.",
    refundPolicy:
      "Refunds do not change membership count unless membership state changes.",
    deduplicationKey: "StudioMembership.id",
    lateDataPolicy:
      "Imported status corrections restate historical membership counts.",
    dimensions: ["plan", "status", "location"],
    reportIds: ["membership"],
  },
  {
    id: "recorded_inventory_sales",
    name: "Recorded inventory sales",
    description: "Recorded retail line-item value by product.",
    decision:
      "Compare retail performance without treating returns as new revenue.",
    unit: "MONEY",
    grain: "One studio payment line item.",
    sourceOfTruth: "StudioPaymentLineItem joined to StudioProduct",
    eligibility: "Non-deleted retail line items in the active location.",
    timestampField: "StudioPaymentLineItem.soldAt",
    timezonePolicy: "Bucket soldAt in the active location timezone.",
    currencyPolicy:
      "Group by ISO currency and exponent. No implicit FX conversion.",
    refundPolicy:
      "Only recorded return line items affect this view; provider-only refunds surface as reconciliation gaps.",
    deduplicationKey: "StudioPaymentLineItem.id",
    lateDataPolicy:
      "Returns restate the original sale period and are also visible by refund date.",
    dimensions: ["product", "category", "supplier", "currency", "location"],
    reportIds: ["inventory-sales-by-product"],
  },
  {
    id: "recorded_line_item_sales",
    name: "Recorded line-item sales",
    description:
      "Sales allocated to recorded studio payment line items, with recorded returns negative.",
    decision:
      "Compare sold services and products without inventing allocations.",
    unit: "MONEY",
    grain: "One StudioPaymentLineItem.",
    sourceOfTruth: "StudioPaymentLineItem joined to StudioPayment",
    eligibility:
      "Non-deleted line items in the active location; payment status is exposed for explicit filtering.",
    timestampField: "StudioPaymentLineItem.soldAt",
    timezonePolicy: "Bucket soldAt in the active location timezone.",
    currencyPolicy:
      "Group by ISO currency and exponent. No implicit FX conversion.",
    refundPolicy:
      "A line item contributes negatively only when it is explicitly recorded as returned.",
    deduplicationKey: "StudioPaymentLineItem.id",
    lateDataPolicy:
      "Late provider refunds remain a visible reconciliation gap until allocated to line items.",
    dimensions: [
      "service",
      "product",
      "category",
      "payment status",
      "location",
    ],
    reportIds: [
      "sales",
      "daily-closeout",
      "cash-drawer",
      "sales-by-category",
      "sales-by-product",
      "sales-by-service",
      "sales-promotions",
      "sales-tax",
      "returns",
      "voided-sales",
    ],
  },
] as const satisfies readonly MetricContract[];

export function getMetricContractsForReport(
  reportId: string,
): readonly MetricContract[] {
  return METRIC_CONTRACTS.filter((contract) =>
    (contract.reportIds as readonly string[]).includes(reportId),
  );
}
