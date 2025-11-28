import { getExecutor } from "@/features/executions/lib/executor-registry";
import { inngest } from "./client";
import { ExecutionStatus, NodeType } from "@/generated/prisma/enums";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { NonRetriableError } from "inngest";

import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { googleCalendarTriggerChannel } from "./channels/google-calendar-trigger";
import { gmailTriggerChannel } from "./channels/gmail-trigger";
import { telegramTriggerChannel } from "./channels/telegram-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { geminiChannel } from "./channels/gemini";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";
import { googleCalendarChannel } from "./channels/google-calendar";
import { gmailChannel } from "./channels/gmail";
import { telegramChannel } from "./channels/telegram";
import { waitChannel } from "./channels/wait";
import { createContactChannel } from "./channels/create-contact";
import { updateContactChannel } from "./channels/update-contact";
import { deleteContactChannel } from "./channels/delete-contact";
import { createDealChannel } from "./channels/create-deal";
import { updateDealChannel } from "./channels/update-deal";
import { deleteDealChannel } from "./channels/delete-deal";
import { updatePipelineChannel } from "./channels/update-pipeline";
import { contactCreatedTriggerChannel } from "./channels/contact-created-trigger";
import { contactUpdatedTriggerChannel } from "./channels/contact-updated-trigger";
import { contactFieldChangedTriggerChannel } from "./channels/contact-field-changed-trigger";
import { contactDeletedTriggerChannel } from "./channels/contact-deleted-trigger";
import { contactTypeChangedTriggerChannel } from "./channels/contact-type-changed-trigger";
import { contactLifecycleStageChangedTriggerChannel } from "./channels/contact-lifecycle-stage-changed-trigger";
import { ifElseChannel } from "./channels/if-else";
import { setVariableChannel } from "./channels/set-variable";
import { stopWorkflowChannel } from "./channels/stop-workflow";
import { switchChannel } from "./channels/switch";
import { loopChannel } from "./channels/loop";
import { bundleWorkflowChannel } from "./channels/bundle-workflow";
import { outlookChannel } from "./channels/outlook";
import { outlookTriggerChannel } from "./channels/outlook-trigger";
import { oneDriveChannel } from "./channels/onedrive";
import { oneDriveTriggerChannel } from "./channels/onedrive-trigger";
import {
  processGoogleCalendarSubscription,
  renewExpiringGoogleCalendarSubscriptions,
} from "@/features/google-calendar/server/subscriptions";
import {
  processGmailNotification,
  renewGmailSubscriptions,
} from "@/features/gmail/server/subscriptions";
import {
  processTelegramUpdate,
  type TelegramUpdate,
} from "@/features/telegram/server/updates";
import {
  processOutlookNotification,
  renewOutlookSubscriptions,
} from "@/features/outlook/server/subscriptions";
import {
  processOneDriveNotification,
  renewOneDriveSubscriptions,
} from "@/features/onedrive/server/subscriptions";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    onFailure: async ({ event }) => {
      return prisma.execution.update({
        where: {
          inngestEventId: event.data.event.id,
        },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      googleCalendarTriggerChannel(),
      gmailTriggerChannel(),
      telegramTriggerChannel(),
      stripeTriggerChannel(),
      geminiChannel(),
      discordChannel(),
      slackChannel(),
      googleCalendarChannel(),
      gmailChannel(),
      telegramChannel(),
      waitChannel(),
      createContactChannel(),
      updateContactChannel(),
      deleteContactChannel(),
      createDealChannel(),
      updateDealChannel(),
      deleteDealChannel(),
      updatePipelineChannel(),
      contactCreatedTriggerChannel(),
      contactUpdatedTriggerChannel(),
      contactFieldChangedTriggerChannel(),
      contactDeletedTriggerChannel(),
      contactTypeChangedTriggerChannel(),
      contactLifecycleStageChangedTriggerChannel(),
      ifElseChannel(),
      setVariableChannel(),
      stopWorkflowChannel(),
      switchChannel(),
      loopChannel(),
      bundleWorkflowChannel(),
      outlookChannel(),
      outlookTriggerChannel(),
      oneDriveChannel(),
      oneDriveTriggerChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId) {
      throw new NonRetriableError("Event ID is missing.");
    }

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is missing.");
    }

    await step.run("create-execution", async () => {
      const workflowMeta = await prisma.workflows.findUnique({
        where: { id: workflowId },
        select: {
          subaccountId: true,
        },
      });

      if (!workflowMeta) {
        throw new NonRetriableError("Workflow not found.");
      }

      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
          subaccountId: workflowMeta.subaccountId,
        },
      });
    });

    const { workflow, userId } = await step.run(
      "prepare-workflow",
      async () => {
        const workflow = await prisma.workflows.findUniqueOrThrow({
          where: { id: workflowId },
          include: {
            nodes: true,
            connections: true,
          },
        });

        return {
          workflow,
          userId: workflow.userId,
        };
      }
    );

    //  initialize context with any initial data from the trigger
    let context: Record<string, unknown> = event.data.initialData || {};

    // Track node-level context contributions for bundle workflows
    const nodeLevelContext = new Map<string, Record<string, unknown>>();

    // Get topologically sorted nodes for execution order
    const sortedNodes = topologicalSort(
      workflow.nodes as any,
      workflow.connections as any
    );

    // Build adjacency map for conditional branching
    const adjacencyMap = new Map<
      string,
      Array<{ toNodeId: string; fromOutput: string }>
    >();
    for (const conn of workflow.connections) {
      if (!adjacencyMap.has(conn.fromNodeId)) {
        adjacencyMap.set(conn.fromNodeId, []);
      }
      adjacencyMap.get(conn.fromNodeId)!.push({
        toNodeId: conn.toNodeId,
        fromOutput: conn.fromOutput,
      });
    }

    // Track which nodes are reachable based on conditional branches
    const reachableNodes = new Set<string>();

    // Find trigger node (first in sorted order with no incoming connections)
    const targetNodeIds = new Set(workflow.connections.map((c) => c.toNodeId));
    const triggerNode = sortedNodes.find((node) => !targetNodeIds.has(node.id));

    if (!triggerNode) {
      throw new NonRetriableError("No trigger node found in workflow");
    }

    reachableNodes.add(triggerNode.id);

    // Execute nodes in topological order
    for (const node of sortedNodes) {
      // Skip if not reachable (due to conditional branching)
      if (!reachableNodes.has(node.id)) {
        continue;
      }

      // Check if workflow should stop
      if (context.shouldStop) {
        break;
      }

      // Capture context before node execution
      const contextBefore = { ...context };

      // Execute the node
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish,
        nodeLevelContext,
        // Pass parent workflow metadata for bundle workflows
        parentWorkflow: {
          workflowId: workflow.id,
          workflowName: workflow.name,
          isBundle: workflow.isBundle,
        },
      });

      // Track what this node added to the context
      // This captures the node's contribution for bundle workflows to reference
      const nodeContribution: Record<string, unknown> = {};

      // Find new/changed values in context.variables
      if (context.variables && typeof context.variables === 'object') {
        const contextBeforeVars = (contextBefore.variables as Record<string, unknown>) || {};
        const contextAfterVars = context.variables as Record<string, unknown>;

        for (const [key, value] of Object.entries(contextAfterVars)) {
          if (contextBeforeVars[key] !== value) {
            nodeContribution[key] = value;
          }
        }
      }

      // Store this node's contribution using node name (more user-friendly than ID)
      nodeLevelContext.set(node.name, nodeContribution);

      // Determine next nodes to mark as reachable
      const nextConnections = adjacencyMap.get(node.id) || [];

      // Handle conditional branching nodes
      if (
        node.type === NodeType.IF_ELSE ||
        node.type === NodeType.SWITCH ||
        node.type === NodeType.LOOP
      ) {
        // Check if there's a branchToFollow in context
        const branchToFollow = context.branchToFollow as string | undefined;

        if (branchToFollow) {
          // Only mark nodes connected via the matching branch as reachable
          for (const conn of nextConnections) {
            if (conn.fromOutput === branchToFollow) {
              reachableNodes.add(conn.toNodeId);
            }
          }

          // Clear the branch indicator
          delete context.branchToFollow;
        } else {
          // Fallback: use variable-based branch (for IF/ELSE compatibility)
          const nodeConfig = node.data as Record<string, unknown>;
          const variableName = nodeConfig.variableName as string;
          const branchResult = (context.variables as Record<string, any>)?.[
            variableName
          ]?.branchToFollow;

          if (branchResult) {
            for (const conn of nextConnections) {
              if (conn.fromOutput === branchResult) {
                reachableNodes.add(conn.toNodeId);
              }
            }
          }
        }
      } else {
        // For regular nodes, mark all connected nodes as reachable
        for (const conn of nextConnections) {
          reachableNodes.add(conn.toNodeId);
        }
      }
    }

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context as any,
        },
      });
    });

    return { workflowId, result: context };
  }
);

export const handleGoogleCalendarNotification = inngest.createFunction(
  { id: "google-calendar-notification", retries: 3 },
  { event: "google-calendar/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processGoogleCalendarSubscription(subscriptionId);
    return { subscriptionId };
  }
);

export const renewGoogleCalendarSubscriptions = inngest.createFunction(
  { id: "google-calendar-renewal", retries: 0 },
  { cron: "0 * * * *" },
  async () => {
    const renewed = await renewExpiringGoogleCalendarSubscriptions();
    return { renewed };
  }
);

export const handleGmailNotification = inngest.createFunction(
  { id: "gmail-notification", retries: 3 },
  { event: "gmail/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processGmailNotification({
      subscriptionId,
      historyId: event.data.historyId as string | undefined,
    });
    return { subscriptionId };
  }
);

export const renewGmailSubscriptionWatches = inngest.createFunction(
  { id: "gmail-renewal", retries: 0 },
  { cron: "0 * * * *" },
  async () => {
    const renewed = await renewGmailSubscriptions();
    return { renewed };
  }
);

export const handleTelegramUpdate = inngest.createFunction(
  { id: "telegram-update", retries: 0 },
  { event: "telegram/update" },
  async ({ event }) => {
    const credentialId = event.data.credentialId as string | undefined;
    const userId = event.data.userId as string | undefined;
    const update = event.data.update as TelegramUpdate | undefined;

    if (!credentialId || !userId || !update) {
      return { skipped: true };
    }

    await processTelegramUpdate({
      credentialId,
      userId,
      update,
    });

    return { credentialId };
  }
);

export const handleOutlookNotification = inngest.createFunction(
  { id: "outlook-notification", retries: 3 },
  { event: "outlook/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processOutlookNotification({ subscriptionId });
    return { subscriptionId };
  }
);

export const renewOutlookSubscriptionWatches = inngest.createFunction(
  { id: "outlook-renewal", retries: 0 },
  { cron: "0 * * * *" },
  async () => {
    const renewed = await renewOutlookSubscriptions();
    return { renewed };
  }
);

export const handleOneDriveNotification = inngest.createFunction(
  { id: "onedrive-notification", retries: 3 },
  { event: "onedrive/subscription.notification" },
  async ({ event }) => {
    const subscriptionId = event.data.subscriptionId as string | undefined;
    if (!subscriptionId) {
      return { skipped: true };
    }

    await processOneDriveNotification({ subscriptionId });
    return { subscriptionId };
  }
);

export const renewOneDriveSubscriptionWatches = inngest.createFunction(
  { id: "onedrive-renewal", retries: 0 },
  { cron: "0 * * * *" },
  async () => {
    const renewed = await renewOneDriveSubscriptions();
    return { renewed };
  }
);
