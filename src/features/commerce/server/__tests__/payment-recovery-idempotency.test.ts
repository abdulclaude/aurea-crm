import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("recovery SMS and workflow actions use durable action-level idempotency", () => {
  const runner = source(
    "src/features/commerce/server/recovery/payment-recovery-action-runner.ts",
  );
  const sms = source("src/features/sms/server/services/enqueue-sms.ts");
  const workflows = source(
    "src/features/studio/server/payment-workflow-triggers.ts",
  );

  assert.match(runner, /idempotencyKey: `\$\{context\.idempotencyKey\}:sms`/);
  assert.match(
    runner,
    /idempotencyKey: `\$\{context\.idempotencyKey\}:workflow`/,
  );
  assert.match(
    sms,
    /target: \[\s*outboundDelivery\.organizationId,\s*outboundDelivery\.idempotencyKey/,
  );
  assert.match(workflows, /idempotencyKey,/);
});

test("legacy ambiguous side effects cannot be retried as ordinary failures", () => {
  const mutations = source(
    "src/features/commerce/server/recovery/payment-recovery-mutation-service.ts",
  );
  assert.match(mutations, /ACTION_SIDE_EFFECT_AMBIGUOUS/);
  assert.match(mutations, /Reconcile the provider outcome/);
});
