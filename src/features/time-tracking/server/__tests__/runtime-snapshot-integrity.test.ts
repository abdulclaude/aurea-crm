import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const router = readFileSync(
  path.join(
    process.cwd(),
    "src/features/time-tracking/server/router.ts",
  ),
  "utf8",
);

test("time log writes keep staff runtime snapshots server-owned", () => {
  assert.match(
    router,
    /customFields: withStaffRuntimeSnapshot\(\s*input\.customFields,\s*runtimeSnapshot,/,
  );
  assert.match(
    router,
    /customFields:\s*input\.customFields === undefined\s*\? null\s*: stripStaffRuntimeSnapshot\(input\.customFields\)/,
  );
  assert.match(
    router,
    /updates\.customFields = preserveStaffRuntimeSnapshot\(\s*existingLog\.customFields,\s*data\.customFields,/,
  );
  assert.doesNotMatch(
    router,
    /customFields:\s*(?:input|data)\.customFields(?:\s*\?\?[^,\n]+)?[,\n]/,
  );
  assert.doesNotMatch(
    router,
    /updates\.customFields\s*=\s*data\.customFields/,
  );
});

test("clock-out derives pay and approval from the stored runtime snapshot", () => {
  const clockOut = router.slice(
    router.indexOf("clockOut: baseProcedure"),
    router.indexOf("// Get active time log"),
  );

  assert.match(
    clockOut,
    /readStaffRuntimeSnapshot\(existingTimeLog\.customFields\)/,
  );
  assert.match(
    clockOut,
    /hourlyRate = runtimeSnapshot\.compensation\.hourlyRate/,
  );
  assert.match(
    clockOut,
    /runtimeSnapshot\.operationsPolicy\.values\.timeEntryApprovalMode/,
  );
  assert.doesNotMatch(clockOut, /input\.customFields/);
});
