import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { createDealChannel } from "@/inngest/channels/create-deal";
import prisma from "@/lib/db";
import { decode } from "html-entities";

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
  contactIds?: string;
};

export const createDealExecutor: NodeExecutor<
  CreateDealData
> = async ({ data, nodeId, userId, context, step, publish }) => {
  await publish(
    createDealChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.variableName) {
      await publish(
        createDealChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Create Deal Node error: No variable name has been set."
      );
    }

    if (!data.name) {
      await publish(
        createDealChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Create Deal Node error: Name is required."
      );
    }

    // Get organization/subaccount from workflow
    const workflow = await step.run("get-workflow-context", async () => {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          Workflows: {
            select: {
              subaccountId: true,
              organizationId: true,
            },
          },
        },
      });

      if (!node?.Workflows?.organizationId) {
        throw new NonRetriableError(
          "Create Deal Node error: This workflow must be in an organization context to create deals."
        );
      }

      return node.Workflows;
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

    const contactIdsStr = data.contactIds
      ? decode(Handlebars.compile(data.contactIds)(context))
      : undefined;
    const contactIds = contactIdsStr
      ? contactIdsStr.split(",").map(id => id.trim()).filter(Boolean)
      : [];

    const deal = await step.run("create-deal", async () => {
      return await prisma.deal.create({
        data: {
          id: crypto.randomUUID(),
          subaccountId: workflow.subaccountId || null,
          organizationId: workflow.organizationId!,
          name,
          value: value !== undefined ? value : null,
          currency: currency || "USD",
          deadline: deadline || null,
          source: source || null,
          description: description || null,
          pipelineId: pipelineId || null,
          pipelineStageId: pipelineStageId || null,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          dealContact: contactIds.length > 0 ? {
            create: contactIds.map(contactId => ({
              id: crypto.randomUUID(),
              contactId,
            })),
          } : undefined,
        },
        include: {
          pipeline: true,
          pipelineStage: true,
          dealContact: {
            include: {
              contact: true,
            },
          },
        },
      });
    });

    await publish(
      createDealChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [data.variableName]: {
        id: deal.id,
        name: deal.name,
        value: deal.value ? deal.value.toString() : null,
        currency: deal.currency,
        deadline: deal.deadline ? (typeof deal.deadline === 'string' ? deal.deadline : (deal.deadline as Date).toISOString()) : null,
        source: deal.source,
        description: deal.description,
        pipelineId: deal.pipelineId,
        pipelineStageId: deal.pipelineStageId,
        createdAt: typeof deal.createdAt === 'string' ? deal.createdAt : (deal.createdAt as Date).toISOString(),
      },
    };
  } catch (error) {
    await publish(
      createDealChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
