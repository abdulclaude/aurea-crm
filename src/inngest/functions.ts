import { getExecutor } from "@/features/executions/lib/executor-registry";
import { inngest } from "./client";
import { ExecutionStatus, type NodeType } from "@/generated/prisma/enums";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { NonRetriableError } from "inngest";

import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { googleCalendarTriggerChannel } from "./channels/google-calendar-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { geminiChannel } from "./channels/gemini";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";
import { googleCalendarChannel } from "./channels/google-calendar";
import {
  processGoogleCalendarSubscription,
  renewExpiringGoogleCalendarSubscriptions,
} from "@/features/google-calendar/server/subscriptions";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    onFailure: async ({ event, step }) => {
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
      stripeTriggerChannel(),
      geminiChannel(),
      discordChannel(),
      slackChannel(),
      googleCalendarChannel(),
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
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
        },
      });
    });

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

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflows.findUniqueOrThrow({
        where: { id: workflowId },
        select: {
          userId: true,
        },
      });

      return workflow.userId;
    });

    //  initialize context with any initial data from the trigger

    let context = event.data.initialData || {};

    // execute each node

    for (const node of sortedNodes) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish,
      });
    }

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
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
