import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { recoveryPolicyUpdateSchema } from "@/features/commerce/recovery-contracts";

const validPolicy = {
  target: "INVOICE" as const,
  mode: "ENABLED" as const,
  name: "Invoice recovery",
  gracePeriodDays: 0,
  maxActions: 5,
  scheduleDays: [0, 3],
  steps: [{ type: "SEND_EMAIL" as const }, { type: "ESCALATE" as const }],
};

describe("payment recovery policy contract", () => {
  it("accepts a bounded action schedule", () => {
    assert.equal(recoveryPolicyUpdateSchema.safeParse(validPolicy).success, true);
  });

  it("rejects duplicate schedule days", () => {
    const result = recoveryPolicyUpdateSchema.safeParse({
      ...validPolicy,
      scheduleDays: [0, 0],
    });
    assert.equal(result.success, false);
  });

  it("rejects mismatched days and actions", () => {
    const result = recoveryPolicyUpdateSchema.safeParse({
      ...validPolicy,
      steps: [{ type: "SEND_EMAIL" }],
    });
    assert.equal(result.success, false);
  });

  it("allows an inherited location policy without a schedule", () => {
    const result = recoveryPolicyUpdateSchema.safeParse({
      ...validPolicy,
      mode: "INHERIT",
      scheduleDays: [],
      steps: [],
    });
    assert.equal(result.success, true);
  });

  it("rejects actions that cannot operate on the selected target", () => {
    const result = recoveryPolicyUpdateSchema.safeParse({
      ...validPolicy,
      scheduleDays: [0],
      steps: [{ type: "RELEASE_BOOKING" }],
    });
    assert.equal(result.success, false);
  });
});
