import assert from "node:assert/strict";
import test from "node:test";
import type { Edge } from "@xyflow/react";

import { getGuaranteedUpstreamNodes } from "../build-node-context";

test("only exposes nodes that run on every incoming branch", () => {
  const edges: Edge[] = [
    { id: "trigger-condition", source: "trigger", target: "condition" },
    {
      id: "condition-yes",
      source: "condition",
      sourceHandle: "true",
      target: "yesAction",
    },
    {
      id: "condition-no",
      source: "condition",
      sourceHandle: "false",
      target: "noAction",
    },
    { id: "yes-merge", source: "yesAction", target: "merge" },
    { id: "no-merge", source: "noAction", target: "merge" },
    { id: "merge-current", source: "merge", target: "current" },
  ];

  const guaranteed = new Set(getGuaranteedUpstreamNodes("current", edges));
  assert.deepEqual(guaranteed, new Set(["trigger", "condition", "merge"]));
  assert.equal(guaranteed.has("yesAction"), false);
  assert.equal(guaranteed.has("noAction"), false);
});

test("keeps every previous node on a linear path", () => {
  const edges: Edge[] = [
    { id: "a-b", source: "a", target: "b" },
    { id: "b-c", source: "b", target: "c" },
  ];

  assert.deepEqual(new Set(getGuaranteedUpstreamNodes("c", edges)), new Set(["a", "b"]));
});
