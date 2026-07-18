import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findReconciliationCandidates } from "../reconciliation-matcher";

describe("findReconciliationCandidates", () => {
  it("matches receipts by receipt id or provider identity", () => {
    const candidates = findReconciliationCandidates({
      receipts: [
        {
          id: "receipt-a",
          type: "checkout.session.completed",
          objectId: "cs_a",
          locationId: "location-a",
        },
        {
          id: "receipt-b",
          type: "payment_intent.succeeded",
          objectId: "pi_b",
          locationId: "location-b",
        },
      ],
      ledgerRecords: [
        {
          id: "ledger-a",
          stripeEventId: "receipt-a",
          providerObjectId: "pi_a",
          paymentIntentId: "pi_a",
          chargeId: null,
          checkoutSessionId: null,
          locationId: "location-a",
        },
        {
          id: "ledger-b",
          stripeEventId: null,
          providerObjectId: "cs_b",
          paymentIntentId: "pi_b",
          chargeId: null,
          checkoutSessionId: null,
          locationId: "location-b",
        },
      ],
    });

    assert.deepEqual(candidates, []);
  });

  it("reports missing local and provider records without counting ignored events", () => {
    const candidates = findReconciliationCandidates({
      receipts: [
        {
          id: "receipt-a",
          type: "invoice.paid",
          objectId: "in_a",
          locationId: "location-a",
        },
        {
          id: "receipt-b",
          type: "customer.updated",
          objectId: "cus_b",
          locationId: "location-b",
        },
      ],
      ledgerRecords: [
        {
          id: "ledger-a",
          stripeEventId: null,
          providerObjectId: "pi_missing",
          paymentIntentId: "pi_missing",
          chargeId: null,
          checkoutSessionId: null,
          locationId: "location-b",
        },
      ],
    });

    assert.deepEqual(candidates, [
      {
        type: "MISSING_LOCAL_RECORD",
        receiptId: "receipt-a",
        ledgerEntryId: null,
        providerObjectId: "in_a",
        locationId: "location-a",
      },
      {
        type: "MISSING_PROVIDER_RECORD",
        receiptId: null,
        ledgerEntryId: "ledger-a",
        providerObjectId: "pi_missing",
        locationId: "location-b",
      },
    ]);
  });

  it("reports a ledger linked to a receipt in another location", () => {
    const candidates = findReconciliationCandidates({
      receipts: [
        {
          id: "receipt-a",
          type: "payment_intent.succeeded",
          objectId: "pi_a",
          locationId: "location-a",
        },
      ],
      ledgerRecords: [
        {
          id: "ledger-a",
          stripeEventId: "receipt-a",
          providerObjectId: "pi_a",
          paymentIntentId: "pi_a",
          chargeId: null,
          checkoutSessionId: null,
          locationId: "location-b",
        },
      ],
    });

    assert.deepEqual(candidates, [
      {
        type: "ORPHANED_REFERENCE",
        receiptId: "receipt-a",
        ledgerEntryId: "ledger-a",
        providerObjectId: "pi_a",
        locationId: "location-a",
        actualLocationId: "location-b",
      },
    ]);
  });
});
