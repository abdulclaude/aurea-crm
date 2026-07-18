import type { AutomationFixtures, GrowthBuildScope, GrowthPackFixtures } from "./types";
import { before } from "./shared";

export function buildAutomationFixtures(scope: GrowthBuildScope): AutomationFixtures {
  const { context, id, metadata } = scope;
  const { organizationId, locationId, actorUserId, referenceDate, runId } = context;
const workflowDefinitions = [
  {
    name: "New member welcome",
    description: "Archived example of a provider-free welcome workflow.",
    archived: true,
    isTemplate: false,
    types: ["INITIAL", "CLIENT_CREATED_TRIGGER", "SET_VARIABLE", "STOP_WORKFLOW"] as const,
  },
  {
    name: "Intro offer nurture",
    description: "Archived branching workflow for intro offer completion.",
    archived: true,
    isTemplate: false,
    types: ["INITIAL", "INTRO_OFFER_COMPLETED_TRIGGER", "IF_ELSE", "ADD_TAG_TO_CLIENT", "STOP_WORKFLOW"] as const,
  },
  {
    name: "Class milestone recognition",
    description: "Reusable template for member attendance milestones.",
    archived: false,
    isTemplate: true,
    types: ["INITIAL", "MEMBER_CLASS_COUNT_TRIGGER", "AWARD_LOYALTY_POINTS", "STOP_WORKFLOW"] as const,
  },
];
const workflowRows: GrowthPackFixtures["workflowRows"] = [];
const nodes: GrowthPackFixtures["nodes"] = [];
const connections: GrowthPackFixtures["connections"] = [];
const executions: GrowthPackFixtures["executions"] = [];
for (const [workflowIndex, definition] of workflowDefinitions.entries()) {
  const workflowId = id("workflow", workflowIndex);
  workflowRows.push({
    id: workflowId,
    name: definition.name,
    description: definition.description,
    userId: actorUserId,
    organizationId,
    locationId,
    archived: definition.archived,
    isTemplate: definition.isTemplate,
    isBundle: false,
    createdAt: before(referenceDate, 150 - workflowIndex * 20),
    updatedAt: before(referenceDate, 20 - workflowIndex * 4),
  });
  const workflowNodes = definition.types.map((type, nodeIndex) => ({
    id: id(`workflow-${workflowIndex}-node`, nodeIndex),
    workflowId,
    name: type.split("_").map((word) => `${word[0] ?? ""}${word.slice(1).toLowerCase()}`).join(" "),
    type,
    position: { x: 100 + nodeIndex * 260, y: type === "IF_ELSE" ? 180 : 100 },
    data: metadata({ inertDemoNode: true }),
    credentialId: null,
    updatedAt: before(referenceDate, 20 - workflowIndex * 4),
  }));
  nodes.push(...workflowNodes);
  for (let nodeIndex = 0; nodeIndex < workflowNodes.length - 1; nodeIndex += 1) {
    const fromNode = workflowNodes[nodeIndex];
    const toNode = workflowNodes[nodeIndex + 1];
    if (!fromNode || !toNode) continue;
    connections.push({
      id: id(`workflow-${workflowIndex}-connection`, nodeIndex),
      workflowId,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      updatedAt: before(referenceDate, 20 - workflowIndex * 4),
    });
  }
  const executionCount = context.profile === "QA_EXHAUSTIVE" ? 32 : 16;
  for (let executionIndex = 0; executionIndex < executionCount; executionIndex += 1) {
    const failed = executionIndex % 8 === 0;
    const startedAt = before(referenceDate, 2 + workflowIndex * 3 + executionIndex * 2, executionIndex % 7);
    executions.push({
      id: id(`workflow-${workflowIndex}-execution`, executionIndex),
      workflowId,
      organizationId,
      locationId,
      inngestEventId: `demo:${runId}:workflow:${workflowIndex}:${executionIndex}`,
      status: failed ? "FAILED" : "SUCCESS",
      startedAt,
      completedAt: new Date(startedAt.getTime() + (failed ? 11_000 : 3_000 + executionIndex * 100)),
      output: failed ? metadata({ outcome: "failed" }) : metadata({ outcome: "completed", nodesVisited: workflowNodes.length }),
      error: failed ? "Synthetic validation branch failed" : undefined,
      errorStack: null,
    });
  }
}


  return { workflowRows, nodes, connections, executions };
}
