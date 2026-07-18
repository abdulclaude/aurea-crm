export const LEDGER_REQUIRED_STRIPE_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "payment_intent.succeeded",
  "charge.refunded",
  "refund.created",
  "refund.updated",
  "charge.dispute.created",
  "charge.dispute.closed",
]);

export type ReconciliationReceipt = {
  id: string;
  type: string;
  objectId: string;
  locationId: string | null;
};

export type ReconciliationLedgerRecord = {
  id: string;
  stripeEventId: string | null;
  providerObjectId: string;
  paymentIntentId: string | null;
  chargeId: string | null;
  checkoutSessionId: string | null;
  locationId: string | null;
};

export type ReconciliationCandidate =
  | {
      type: "MISSING_LOCAL_RECORD";
      receiptId: string;
      ledgerEntryId: null;
      providerObjectId: string;
      locationId: string | null;
    }
  | {
      type: "MISSING_PROVIDER_RECORD";
      receiptId: null;
      ledgerEntryId: string;
      providerObjectId: string;
      locationId: string | null;
    }
  | {
      type: "ORPHANED_REFERENCE";
      receiptId: string;
      ledgerEntryId: string;
      providerObjectId: string;
      locationId: string;
      actualLocationId: string;
    };

function ledgerIdentityValues(record: ReconciliationLedgerRecord): string[] {
  return [
    record.providerObjectId,
    record.paymentIntentId,
    record.chargeId,
    record.checkoutSessionId,
  ].filter((value): value is string => Boolean(value));
}

export function findReconciliationCandidates(input: {
  receipts: ReconciliationReceipt[];
  ledgerRecords: ReconciliationLedgerRecord[];
}): ReconciliationCandidate[] {
  const receiptIds = new Set(input.receipts.map((receipt) => receipt.id));
  const receiptObjectIds = new Set(
    input.receipts.map((receipt) => receipt.objectId),
  );
  const ledgerByReceiptId = new Map<string, ReconciliationLedgerRecord>();
  const ledgerByObjectId = new Map<string, ReconciliationLedgerRecord>();
  for (const record of input.ledgerRecords) {
    if (record.stripeEventId) ledgerByReceiptId.set(record.stripeEventId, record);
    for (const value of ledgerIdentityValues(record)) {
      ledgerByObjectId.set(value, record);
    }
  }
  const receiptCandidates = input.receipts
    .filter((receipt) => LEDGER_REQUIRED_STRIPE_EVENT_TYPES.has(receipt.type))
    .flatMap((receipt): ReconciliationCandidate[] => {
      const ledger =
        ledgerByReceiptId.get(receipt.id) ??
        ledgerByObjectId.get(receipt.objectId);
      if (!ledger) {
        return [
          {
            type: "MISSING_LOCAL_RECORD",
            receiptId: receipt.id,
            ledgerEntryId: null,
            providerObjectId: receipt.objectId,
            locationId: receipt.locationId,
          },
        ];
      }
      if (
        receipt.locationId &&
        ledger.locationId &&
        receipt.locationId !== ledger.locationId
      ) {
        return [
          {
            type: "ORPHANED_REFERENCE",
            receiptId: receipt.id,
            ledgerEntryId: ledger.id,
            providerObjectId: receipt.objectId,
            locationId: receipt.locationId,
            actualLocationId: ledger.locationId,
          },
        ];
      }
      return [];
    });

  const missingProvider = input.ledgerRecords
    .filter((record) => {
      if (record.stripeEventId && receiptIds.has(record.stripeEventId)) {
        return false;
      }
      return !ledgerIdentityValues(record).some((value) =>
        receiptObjectIds.has(value),
      );
    })
    .map(
      (record): ReconciliationCandidate => ({
        type: "MISSING_PROVIDER_RECORD",
        receiptId: null,
        ledgerEntryId: record.id,
        providerObjectId: record.providerObjectId,
        locationId: record.locationId,
      }),
    );

  return [...receiptCandidates, ...missingProvider];
}
