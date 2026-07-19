import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../use-node-status.ts", import.meta.url),
  "utf8",
);
const executeButtonSource = readFileSync(
  new URL(
    "../../../editor/components/execute-workflow-button.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("node realtime is idle until the workflow is explicitly monitored", () => {
  assert.match(source, /useWorkflowRealtime\(\)/);
  assert.match(source, /enabled: enabled && token !== null/);
  assert.match(source, /InngestSubscriptionState\.Active/);
  assert.match(source, /reportSubscriptionReady/);
  assert.doesNotMatch(source, /enabled:\s*true/);
});

test("node status reads the latest event without sorting retained history", () => {
  assert.match(source, /latestData/);
  assert.doesNotMatch(source, /\.sort\(/);
});

test("manual execution waits for realtime subscriptions before dispatching", () => {
  assert.match(
    executeButtonSource,
    /await startMonitoring\(\);[\s\S]*executeWorkflow\.mutate\(/,
  );
});
