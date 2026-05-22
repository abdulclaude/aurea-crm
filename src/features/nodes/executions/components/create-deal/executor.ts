import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { createDealChannel } from "@/inngest/channels/create-deal";
import { decode } from "html-entities";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { deal as dealTable, dealClient, node as nodeTable } from "@/db/schema";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type CreateDealData = {
  variableName?: string;
  name: string;
  value?: string;
  currency?: string;
  deadline?: string;
  source?: string;
  description?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  clientIds?: string;
};

export const createDealExecutor: NodeExecutor<CreateDealData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(createDealChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      await publish(createDealChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Create deal node error: No variable name has been set.",
      );
    }

    if (!data.name) {
      await publish(createDealChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Create deal node error: Name is required.");
    }

    // Get organization/location from workflow
    const workflow = await step.run("get-workflow-context", async () => {
      const node = await db.query.node.findFirst({
        where: eq(nodeTable.id, nodeId),
        with: {
          workflow: {
            columns: {
              locationId: true,
              organizationId: true,
            },
          },
        },
      });

      if (!node?.workflow?.organizationId) {
        throw new NonRetriableError(
          "Create deal node error: This workflow must be in an organization context to create deals.",
        );
      }

      return {
        organizationId: node.workflow.organizationId,
        locationId: node.workflow.locationId,
      };
    });

    // Compile all fields with Handlebars
    const name = decode(Handlebars.compile(data.name)(context));
    const valueStr = data.value
      ? decode(Handlebars.compile(data.value)(context))
      : undefined;
    const value = valueStr ? parseFloat(valueStr) : undefined;

    const currency = data.currency
      ? decode(Handlebars.compile(data.currency)(context))
      : "USD";

    const deadlineStr = data.deadline
      ? decode(Handlebars.compile(data.deadline)(context))
      : undefined;
    const deadline = deadlineStr ? new Date(deadlineStr) : undefined;

    const source = data.source
      ? decode(Handlebars.compile(data.source)(context))
      : undefined;
    const description = data.description
      ? decode(Handlebars.compile(data.description)(context))
      : undefined;

    const pipelineId = data.pipelineId
      ? decode(Handlebars.compile(data.pipelineId)(context))
      : undefined;
    const pipelineStageId = data.pipelineStageId
      ? decode(Handlebars.compile(data.pipelineStageId)(context))
      : undefined;

    const clientIdsStr = data.clientIds
      ? decode(Handlebars.compile(data.clientIds)(context))
      : undefined;
    const clientIds = clientIdsStr
      ? clientIdsStr
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const deal = await step.run("create-deal", async () => {
      const createdDeal = await db.transaction(async (tx) => {
        const [newDeal] = await tx
          .insert(dealTable)
          .values({
          id: createId(),
          locationId: workflow.locationId || null,
          organizationId: workflow.organizationId,
          name,
          value: value !== undefined ? value.toString() : null,
          currency: currency || "USD",
          deadline: deadline || null,
          source: source || null,
          description: description || null,
          pipelineId: pipelineId || null,
          pipelineStageId: pipelineStageId || null,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
          .returning();

        if (clientIds.length > 0) {
          await tx.insert(dealClient).values(
            clientIds.map((clientId) => ({
              id: createId(),
              dealId: newDeal.id,
              clientId,
            }))
          );
        }

        return newDeal;
      });

      const dealWithRelations = await db.query.deal.findFirst({
        where: eq(dealTable.id, createdDeal.id),
        with: {
          pipeline: true,
          pipelineStage: true,
          dealClients: {
            with: {
              client: true,
            },
          },
        },
      });

      return dealWithRelations ?? createdDeal;
    });

    await publish(createDealChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: {
        id: deal.id,
        name: deal.name,
        value: deal.value ? deal.value.toString() : null,
        currency: deal.currency,
        deadline: deal.deadline
          ? typeof deal.deadline === "string"
            ? deal.deadline
            : (deal.deadline as Date).toISOString()
          : null,
        source: deal.source,
        description: deal.description,
        pipelineId: deal.pipelineId,
        pipelineStageId: deal.pipelineStageId,
        createdAt:
          typeof deal.createdAt === "string"
            ? deal.createdAt
            : (deal.createdAt as Date).toISOString(),
      },
    };
  } catch (error) {
    await publish(createDealChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
