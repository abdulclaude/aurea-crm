import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "src/inngest/functions.ts"),
  "utf8",
);

describe("Inngest workflow readiness preflight", () => {
  it("enforces graph and node availability before external-trigger execution", () => {
    const createExecutionStart = source.indexOf(
      'step.run("create-execution"',
    );
    const insertExecution = source.indexOf(".insert(executionTable)", createExecutionStart);
    const activationCheck = source.indexOf(
      "getWorkflowActivationIssues(workflowMeta)",
      createExecutionStart,
    );

    assert.ok(createExecutionStart >= 0);
    assert.ok(activationCheck > createExecutionStart);
    assert.ok(activationCheck < insertExecution);
    assert.match(source, /connections: \{\s*columns: \{ fromNodeId: true, toNodeId: true \}/);
  });
});
