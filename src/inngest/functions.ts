import { getExecutor } from "@/features/executions/lib/executor-registry";
import { inngest } from "./client";
import type { NodeType } from "@/generated/prisma/enums";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { NonRetriableError } from "inngest";

// AI

// Sentry

export const executeWorkflow = inngest.createFunction(
  { id: "execute-workflow" },
  { event: "workflows/execute.workflow" },
  async ({ event, step }) => {
    const workflowId = event.data.workflowId;

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is missing.");
    }

    const sortedNodes = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflows.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          connections: true,
        },
      });

      return topologicalSort(workflow.nodes, workflow.connections);
    });

    //  initialize context with any initial data from the trigger

    let context = event.data.initialData || {};

    // execute each node

    for (const node of sortedNodes) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        context,
        step,
      });
    }

    return { workflowId, result: context };
  }
);
