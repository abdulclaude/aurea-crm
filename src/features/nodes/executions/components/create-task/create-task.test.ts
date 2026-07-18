import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { createTaskFormSchema } from "./config";

describe("create task workflow action", () => {
  it("validates editable due time, priority, and templated fields", () => {
    const parsed = createTaskFormSchema.parse({
      title: "Call {{triggerData.client.name}}",
      description: "Welcome the new member",
      dueAmount: 24,
      dueUnit: "HOURS",
      priority: "HIGH",
      clientId: "{{triggerData.clientId}}",
      assigneeId: "{{workflowOwner.id}}",
      variableName: "followUpTask",
    });
    assert.equal(parsed.dueAmount, 24);
    assert.equal(parsed.variableName, "followUpTask");
  });

  it("rejects invalid durations and variable names", () => {
    assert.throws(() =>
      createTaskFormSchema.parse({
        title: "Follow up",
        dueAmount: 0,
        dueUnit: "HOURS",
        priority: "MEDIUM",
        variableName: "not valid",
      }),
    );
  });

  it("keeps clients and assignees scoped and task creation idempotent", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/features/nodes/executions/components/create-task/executor.ts",
      ),
      "utf8",
    );
    assert.match(source, /eq\(client\.organizationId, scope\.organizationId\)/);
    assert.match(source, /eq\(member\.organizationId, scope\.organizationId\)/);
    assert.match(source, /eq\(locationMember\.locationId, scope\.locationId\)/);
    assert.match(source, /workflow-task:\$\{scope\.executionId\}:\$\{nodeId\}/);
    assert.match(source, /onConflictDoNothing/);
    assert.match(source, /return db\.transaction/);
    assert.match(source, /actorCapabilities\.includes\("workflow\.manage"\)/);
    assert.match(source, /\.for\("update"\)/);
  });
});
