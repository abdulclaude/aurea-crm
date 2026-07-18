import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidDeliveryStatusTransitionError,
  canTransitionDeliveryStatus,
  projectProviderEventStatus,
  transitionDeliveryStatus,
} from "@/features/delivery/lib/state-machine";

describe("delivery status state machine", () => {
  it("allows normal dispatch and receipt progression", () => {
    assert.equal(canTransitionDeliveryStatus("QUEUED", "SENDING"), true);
    assert.equal(canTransitionDeliveryStatus("SENDING", "ACCEPTED"), true);
    assert.equal(canTransitionDeliveryStatus("ACCEPTED", "DELIVERED"), true);
  });

  it("treats same-status transitions as idempotent", () => {
    assert.equal(canTransitionDeliveryStatus("DELIVERED", "DELIVERED"), true);
    assert.equal(
      transitionDeliveryStatus("DELIVERED", "DELIVERED"),
      "DELIVERED",
    );
  });

  it("prevents terminal delivery status regression", () => {
    assert.equal(canTransitionDeliveryStatus("DELIVERED", "ACCEPTED"), false);
    assert.throws(
      () => transitionDeliveryStatus("BOUNCED", "DELIVERED"),
      InvalidDeliveryStatusTransitionError,
    );
  });

  it("supports explicit retries for uncertain and dead-lettered work", () => {
    assert.equal(canTransitionDeliveryStatus("UNKNOWN", "QUEUED"), true);
    assert.equal(canTransitionDeliveryStatus("DEAD_LETTER", "QUEUED"), true);
    assert.equal(canTransitionDeliveryStatus("SUPPRESSED", "QUEUED"), true);
  });

  it("allows terminal provider failures after API acceptance", () => {
    assert.equal(canTransitionDeliveryStatus("ACCEPTED", "SUPPRESSED"), true);
    assert.equal(canTransitionDeliveryStatus("ACCEPTED", "DEAD_LETTER"), true);
  });
});

describe("provider event projection", () => {
  it("moves accepted work to delivered", () => {
    assert.deepEqual(projectProviderEventStatus("ACCEPTED", "DELIVERED"), {
      status: "DELIVERED",
      changed: true,
    });
  });

  it("accepts a delivery receipt that races the send acknowledgement", () => {
    assert.deepEqual(projectProviderEventStatus("SENDING", "DELIVERED"), {
      status: "DELIVERED",
      changed: true,
    });
  });

  it("does not regress a terminal delivery on a late event", () => {
    assert.deepEqual(projectProviderEventStatus("DELIVERED", "ACCEPTED"), {
      status: "DELIVERED",
      changed: false,
    });
  });

  it("records engagement separately from delivery status", () => {
    assert.deepEqual(projectProviderEventStatus("DELIVERED", "OPENED"), {
      status: "DELIVERED",
      changed: false,
    });
  });
});
