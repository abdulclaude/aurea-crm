import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GENERATED_WORKFLOW_DRAFT_STATE,
  parseGeneratedWorkflow,
} from "../workflow-contract";

const triggerDefinitions = [
  { type: "MANUAL_TRIGGER" },
  { type: "CLIENT_CREATED_TRIGGER" },
];
const executionDefinitions = [
  { type: "CREATE_DEAL" },
  { type: "SET_VARIABLE" },
  { type: "STOP_WORKFLOW" },
];

function node(id: string, type: string): Record<string, unknown> {
  return {
    id,
    name: id,
    type,
    position: { x: 0, y: 0 },
    data: {},
  };
}

describe("generated workflow contract", () => {
  it("persists generated workflows as inert drafts", () => {
    assert.deepEqual(GENERATED_WORKFLOW_DRAFT_STATE, { archived: true });
  });

  it("accepts materially different tenant-configurable workflow shapes", () => {
    const manual = parseGeneratedWorkflow({
      text: JSON.stringify({
        name: "Manual sales handoff",
        description: "Creates a deal after a manual review.",
        nodes: [node("start", "MANUAL_TRIGGER"), node("deal", "CREATE_DEAL")],
        connections: [{ sourceId: "start", targetId: "deal" }],
      }),
      mode: "workflow",
      triggerDefinitions,
      executionDefinitions,
    });
    const lifecycle = parseGeneratedWorkflow({
      text: JSON.stringify({
        name: "Lifecycle preparation",
        description: "Sets context and stops after a new client arrives.",
        nodes: [
          node("start", "CLIENT_CREATED_TRIGGER"),
          node("set", "SET_VARIABLE"),
          node("stop", "STOP_WORKFLOW"),
        ],
        connections: [
          { sourceId: "start", targetId: "set" },
          { sourceId: "set", targetId: "stop" },
        ],
      }),
      mode: "workflow",
      triggerDefinitions,
      executionDefinitions,
    });

    assert.equal(manual?.nodes.length, 2);
    assert.equal(lifecycle?.nodes.length, 3);
  });

  it("rejects unknown nodes, cycles, and invalid trigger counts", () => {
    const base = {
      name: "Unsafe workflow",
      description: "Must be rejected.",
    };

    assert.equal(
      parseGeneratedWorkflow({
        text: JSON.stringify({
          ...base,
          nodes: [node("start", "MANUAL_TRIGGER"), node("bad", "UNKNOWN")],
          connections: [{ sourceId: "start", targetId: "bad" }],
        }),
        mode: "workflow",
        triggerDefinitions,
        executionDefinitions,
      }),
      null,
    );
    assert.equal(
      parseGeneratedWorkflow({
        text: JSON.stringify({
          ...base,
          nodes: [node("start", "MANUAL_TRIGGER"), node("end", "STOP_WORKFLOW")],
          connections: [
            { sourceId: "start", targetId: "end" },
            { sourceId: "end", targetId: "start" },
          ],
        }),
        mode: "workflow",
        triggerDefinitions,
        executionDefinitions,
      }),
      null,
    );
    assert.equal(
      parseGeneratedWorkflow({
        text: JSON.stringify({
          ...base,
          nodes: [node("one", "MANUAL_TRIGGER"), node("two", "CLIENT_CREATED_TRIGGER")],
          connections: [{ sourceId: "one", targetId: "two" }],
        }),
        mode: "workflow",
        triggerDefinitions,
        executionDefinitions,
      }),
      null,
    );
  });
});
