import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { invoiceReminderDeliveryProjection } from "../invoice-reminder-delivery";

const occurredAt = new Date("2026-07-15T10:00:00.000Z");

function delivery(
  overrides: Partial<
    Parameters<typeof invoiceReminderDeliveryProjection>[0]
  > = {},
): Parameters<typeof invoiceReminderDeliveryProjection>[0] {
  return {
    id: "delivery-1",
    sourceType: "INVOICE_REMINDER",
    status: "QUEUED",
    providerAccountId: "provider-account-1",
    acceptedAt: null,
    deliveredAt: null,
    bouncedAt: null,
    openedAt: null,
    updatedAt: occurredAt,
    lastErrorMessage: null,
    ...overrides,
  };
}

describe("invoice reminder delivery projection", () => {
  it("does not claim a queued reminder was sent", () => {
    const projection = invoiceReminderDeliveryProjection(delivery());

    assert.equal(projection?.deliveryStatus, "QUEUED");
    assert.equal(projection?.sentAt, undefined);
    assert.equal(projection?.deliveredAt, undefined);
  });

  it("records provider acceptance separately from delivery", () => {
    const projection = invoiceReminderDeliveryProjection(
      delivery({ status: "ACCEPTED", acceptedAt: occurredAt }),
    );

    assert.equal(projection?.sentAt, occurredAt);
    assert.equal(projection?.deliveredAt, undefined);
    assert.equal(projection?.failureMessage, null);
  });

  it("projects delivery and opens without losing accepted truth", () => {
    const projection = invoiceReminderDeliveryProjection(
      delivery({
        status: "DELIVERED",
        acceptedAt: occurredAt,
        deliveredAt: occurredAt,
        openedAt: occurredAt,
      }),
    );

    assert.equal(projection?.sentAt, occurredAt);
    assert.equal(projection?.deliveredAt, occurredAt);
    assert.equal(projection?.opened, true);
    assert.equal(projection?.openedAt, occurredAt);
  });

  it("records a terminal delivery failure without inventing sentAt", () => {
    const projection = invoiceReminderDeliveryProjection(
      delivery({ status: "DEAD_LETTER", lastErrorMessage: "Rejected" }),
    );

    assert.equal(projection?.sentAt, undefined);
    assert.equal(projection?.failedAt, occurredAt);
    assert.equal(projection?.failureMessage, "Rejected");
  });

  it("ignores unrelated delivery sources", () => {
    assert.equal(
      invoiceReminderDeliveryProjection(
        delivery({ sourceType: "CAMPAIGN_RECIPIENT" }),
      ),
      null,
    );
  });
});
