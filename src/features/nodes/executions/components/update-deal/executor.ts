import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { updateDealChannel } from "@/inngest/channels/update-deal";
import prisma from "@/lib/db";
import { decode } from "html-entities";

type UpdateDealData = {
  variableName?: string;
  dealId: string;
  name?: string;
  value?: string;
  currency?: string;
  deadline?: string;
  source?: string;
  description?: string;
};

export const updateDealExecutor: NodeExecutor<
  UpdateDealData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    updateDealChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.variableName) {
      await publish(
        updateDealChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Update Deal Node error: No variable name has been set."
      );
    }

    if (!data.dealId) {
      await publish(
        updateDealChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Update Deal Node error: Deal ID is required."
      );
    }

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
          "Update Deal Node error: This workflow must be in an organization context."
        );
      }

      return node.Workflows;
    });

    const dealId = decode(Handlebars.compile(data.dealId)(context));

    const updateData: Record<string, unknown> = {};

    if (data.name) {
      updateData.name = decode(Handlebars.compile(data.name)(context));
    }
    if (data.value !== undefined && data.value !== "") {
      const valueStr = decode(Handlebars.compile(data.value)(context));
      updateData.value = valueStr ? parseFloat(valueStr) : null;
    }
    if (data.currency !== undefined && data.currency !== "") {
      updateData.currency = decode(Handlebars.compile(data.currency)(context));
    }
    if (data.deadline !== undefined && data.deadline !== "") {
      const deadlineStr = decode(Handlebars.compile(data.deadline)(context));
      updateData.deadline = deadlineStr ? new Date(deadlineStr) : null;
    }
    if (data.source !== undefined && data.source !== "") {
      updateData.source = data.source
        ? decode(Handlebars.compile(data.source)(context))
        : null;
    }
    if (data.description !== undefined && data.description !== "") {
      updateData.description = data.description
        ? decode(Handlebars.compile(data.description)(context))
        : null;
    }

    const deal = await step.run("update-deal", async () => {
      return await prisma.deal.update({
        where: {
          id: dealId,
          ...(workflow.subaccountId
            ? { subaccountId: workflow.subaccountId }
            : { organizationId: workflow.organizationId! }),
        },
        data: updateData,
      });
    });

    await publish(
      updateDealChannel().status({ nodeId, status: "success" })
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
        updatedAt: typeof deal.updatedAt === 'string' ? deal.updatedAt : (deal.updatedAt as Date).toISOString(),
      },
    };
  } catch (error) {
    await publish(
      updateDealChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
