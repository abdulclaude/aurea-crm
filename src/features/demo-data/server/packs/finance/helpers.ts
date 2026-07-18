import {
  currencyExponent,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { DAY, DEMO_FINANCE_PROVIDER } from "./constants";
import type {
  FinanceFixturePlan,
  LedgerSeed,
  OperationSeed,
  PaymentSeed,
} from "./types";

export function before(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * DAY);
}

export function pick<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index % items.length];
  if (!item)
    throw new Error(`Finance demo pack requires at least one ${label}`);
  return item;
}

export function operationStatus(
  status: LedgerSeed["status"],
): OperationSeed["status"] {
  if (status === "PENDING") return "PROVIDER_PENDING";
  if (status === "FAILED" || status === "LOST") return "FAILED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "DISPUTED") return "REQUIRES_ACTION";
  return "SUCCEEDED";
}

export function studioStatus(
  status: LedgerSeed["status"],
): PaymentSeed["status"] {
  if (status === "PENDING") return "PENDING";
  if (status === "FAILED" || status === "LOST") return "FAILED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "REFUNDED") return "REFUNDED";
  return "SUCCEEDED";
}

export function addTender(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  entry: LedgerSeed,
  index: number,
): void {
  const firstAmount =
    index % 7 === 0 ? Math.trunc(entry.amountMinor / 2) : entry.amountMinor;
  const types =
    index % 7 === 0
      ? (["MANUAL", "GIFT_CARD"] as const)
      : ([index % 5 === 0 ? "BANK_TRANSFER" : "MANUAL"] as const);
  types.forEach((type, part) =>
    plan.tenders.push({
      id: deterministicDemoId(
        context.runId,
        "finance-tender",
        `${entry.id}-${part}`,
      ),
      organizationId: context.organizationId,
      locationId: context.locationId,
      ledgerEntryId: entry.id,
      type,
      amountMinor: part === 0 ? firstAmount : entry.amountMinor - firstAmount,
      currency: entry.currency,
      currencyExponent: entry.currencyExponent,
      metadata: demoMetadata(context, { synthetic: true }),
      createdAt: entry.occurredAt,
    }),
  );
}

export type LedgerInput = {
  index: string;
  kind: LedgerSeed["kind"];
  status: LedgerSeed["status"];
  amount: number;
  occurredAt: Date;
  clientId?: string;
  instructorId?: string;
  invoiceId?: string;
  studioPaymentId?: string;
  invoicePaymentId?: string;
  operationId?: string;
};

export function addLedger(
  plan: FinanceFixturePlan,
  context: DemoSeedContext,
  input: LedgerInput,
): LedgerSeed {
  const final = !["PENDING", "FAILED", "CANCELLED", "LOST"].includes(
    input.status,
  );
  const fee =
    final && input.kind === "PAYMENT"
      ? Math.min(input.amount, Math.trunc((input.amount * 29) / 1000) + 30)
      : null;
  const entry: LedgerSeed = {
    id: deterministicDemoId(context.runId, "finance-ledger", input.index),
    organizationId: context.organizationId,
    locationId: context.locationId,
    operationId: input.operationId,
    provider: DEMO_FINANCE_PROVIDER,
    providerAccountId: null,
    stripeConnectionId: null,
    instructorId: input.instructorId,
    idempotencyKey: `demo:${context.runId}:ledger:${input.index}`,
    providerObjectId: `aurea-demo:${context.runId}:${input.index}`,
    providerObjectType: input.kind.toLowerCase(),
    kind: input.kind,
    status: input.status,
    amountMinor: input.amount,
    feeMinor: fee,
    netMinor: fee === null ? null : input.amount - fee,
    currency: normalizeCurrency(context.currency),
    currencyExponent: currencyExponent(context.currency),
    clientId: input.clientId,
    invoiceId: input.invoiceId,
    studioPaymentId: input.studioPaymentId,
    invoicePaymentId: input.invoicePaymentId,
    occurredAt: input.occurredAt,
    metadata: demoMetadata(context, { synthetic: true }),
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  };
  plan.ledgerEntries.push(entry);
  return entry;
}
