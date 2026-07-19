import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("form submissions persist dispatch state before requesting Inngest", () => {
  const publicService = source(
    "src/features/publications/server/form-submission-service.ts",
  );
  const triggerService = source(
    "src/features/workflows/server/form-submitted-trigger-service.ts",
  );

  assert.match(publicService, /triggerDispatchStatus: "PENDING"/);
  assert.match(triggerService, /triggerDispatchStatus: "DISPATCHING"/);
  assert.match(triggerService, /triggerDispatchStatus: "DISPATCHED"/);
  assert.match(triggerService, /findPendingFormSubmittedWorkflowDispatches/);
});

test("workflow execution replays are idempotent and cannot overwrite success", () => {
  const executionSource = source("src/inngest/functions.ts");

  assert.match(
    executionSource,
    /onConflictDoNothing\(\{ target: executionTable\.inngestEventId \}\)/,
  );
  assert.match(
    executionSource,
    /eq\(executionTable\.status, ExecutionStatus\.RUNNING\)/,
  );
  assert.match(executionSource, /if \(executionClaim\.duplicate\)/);
});

test("durable form trigger migration does not enroll historic submissions", () => {
  const migration = source("drizzle/0069_durable_form_trigger_dispatch.sql");

  assert.match(migration, /ADD COLUMN "triggerDispatchStatus" text/);
  assert.doesNotMatch(migration, /DEFAULT 'PENDING'/);
  assert.doesNotMatch(migration, /UPDATE "FormSubmission"/);
});
