import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { updateDealChannel } from "@/inngest/channels/update-deal";
import { decode } from "html-entities";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { deal as dealTable, node as nodeTable } from "@/db/schema";

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
          "Update Deal Node error: This workflow must be in an organization context."
        );
      }

      return {
        organizationId: node.workflow.organizationId,
        locationId: node.workflow.locationId,
      };
    });

    const dealId = decode(Handlebars.compile(data.dealId)(context));

    const updateData: Partial<typeof dealTable.$inferInsert> = {};

    if (data.name) {
      updateData.name = decode(Handlebars.compile(data.name)(context));
    }
    if (data.value !== undefined && data.value !== "") {
      const valueStr = decode(Handlebars.compile(data.value)(context));
      updateData.value = valueStr ? parseFloat(valueStr).toString() : null;
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
      const [updatedDeal] = await db
        .update(dealTable)
        .set({ ...updateData, updatedAt: new Date() })
        .where(
          and(
            eq(dealTable.id, dealId),
            workflow.locationId
              ? eq(dealTable.locationId, workflow.locationId)
              : eq(dealTable.organizationId, workflow.organizationId)
          )
        )
        .returning();

      if (!updatedDeal) {
        throw new NonRetriableError(
          `Update Deal Node error: Deal with ID ${dealId} not found.`
        );
      }

      return updatedDeal;
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
