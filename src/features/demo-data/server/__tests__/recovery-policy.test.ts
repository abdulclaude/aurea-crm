import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_RUN_STALE_AFTER_MS,
  decideDemoRunRecovery,
} from "@/features/demo-data/server/recovery-policy";

const updatedAt = new Date("2026-07-14T12:00:00.000Z");

test("fresh demo operations cannot be recovered", () => {
  const decision = decideDemoRunRecovery({
    status: "RUNNING",
    updatedAt,
    now: new Date(updatedAt.getTime() + DEMO_RUN_STALE_AFTER_MS - 1),
    registryCount: 0,
  });

  assert.equal(decision.kind, "TOO_RECENT");
});

test("stale population and partial clear operations fail closed", () => {
  const now = new Date(updatedAt.getTime() + DEMO_RUN_STALE_AFTER_MS);

  assert.equal(
    decideDemoRunRecovery({
      status: "RUNNING",
      updatedAt,
      now,
      registryCount: 0,
    }).kind,
    "MARK_FAILED",
  );
  assert.equal(
    decideDemoRunRecovery({
      status: "CLEARING",
      updatedAt,
      now,
      registryCount: 12,
    }).kind,
    "MARK_FAILED",
  );
});

test("an interrupted clear is complete only after its registry is empty", () => {
  const decision = decideDemoRunRecovery({
    status: "CLEARING",
    updatedAt,
    now: new Date(updatedAt.getTime() + DEMO_RUN_STALE_AFTER_MS),
    registryCount: 0,
  });

  assert.equal(decision.kind, "MARK_CLEARED");
});
