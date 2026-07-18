import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_WORKFLOW_BEHAVIOR,
  parseWorkflowBehavior,
  workflowEnrollmentClientId,
} from "@/features/workflows/lib/workflow-behavior";

describe("workflow behavior", () => {
  it("defaults legacy and malformed workflows to every event", () => {
    assert.deepEqual(
      parseWorkflowBehavior(undefined),
      DEFAULT_WORKFLOW_BEHAVIOR,
    );
    assert.deepEqual(
      parseWorkflowBehavior({ enrollment: "UNKNOWN" }),
      DEFAULT_WORKFLOW_BEHAVIOR,
    );
  });

  it("accepts once-per-member enrollment", () => {
    assert.deepEqual(parseWorkflowBehavior({ enrollment: "ONCE_PER_MEMBER" }), {
      enrollment: "ONCE_PER_MEMBER",
    });
  });

  it("finds a member from both supported trigger contracts", () => {
    assert.equal(
      workflowEnrollmentClientId({
        triggerData: { clientId: "client-direct" },
      }),
      "client-direct",
    );
    assert.equal(
      workflowEnrollmentClientId({
        triggerData: { client: { id: "client-nested" } },
      }),
      "client-nested",
    );
    assert.equal(workflowEnrollmentClientId({ triggerData: {} }), null);
  });
});
