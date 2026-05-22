import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { moveDealStageChannel } from "@/inngest/channels/move-deal-stage";
import { decode } from "html-entities";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { deal as dealTable, pipelineStage as pipelineStageTable } from "@/db/schema";

type MoveDealStageData = {
  dealId: string;
  pipelineStageId: string;
  variableName?: string;
};

export const moveDealStageExecutor: NodeExecutor<MoveDealStageData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(moveDealStageChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.dealId) {
      await publish(moveDealStageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Move Deal Stage Node error: Deal ID is required."
      );
    }

    if (!data.pipelineStageId) {
      await publish(moveDealStageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Move Deal Stage Node error: Pipeline Stage ID is required."
      );
    }

    // Compile fields with Handlebars
    const dealId = decode(Handlebars.compile(data.dealId)(context));
    const pipelineStageId = decode(Handlebars.compile(data.pipelineStageId)(context));

    const deal = await step.run("move-deal-stage", async () => {
      // Verify deal exists
      const existingDeal = await db.query.deal.findFirst({
        where: eq(dealTable.id, dealId),
      });

      if (!existingDeal) {
        throw new NonRetriableError(
          `Move Deal Stage Node error: Deal with ID ${dealId} not found.`
        );
      }

      // Verify pipeline stage exists
      const pipelineStage = await db.query.pipelineStage.findFirst({
        where: eq(pipelineStageTable.id, pipelineStageId),
        with: { pipeline: true },
      });

      if (!pipelineStage) {
        throw new NonRetriableError(
          `Move Deal Stage Node error: Pipeline Stage with ID ${pipelineStageId} not found.`
        );
      }

      await db
        .update(dealTable)
        .set({
          pipelineStageId: pipelineStageId,
          pipelineId: pipelineStage.pipelineId,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dealTable.id, dealId));

      const updatedDeal = await db.query.deal.findFirst({
        where: eq(dealTable.id, dealId),
        with: {
          pipelineStage: true,
          pipeline: true,
        },
      });

      if (!updatedDeal) {
        throw new NonRetriableError(
          `Move Deal Stage Node error: Deal with ID ${dealId} not found after update.`
        );
      }

      return updatedDeal;
    });

    await publish(moveDealStageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              id: deal.id,
              name: deal.name,
              value: deal.value?.toString(),
              pipelineStageId: deal.pipelineStageId,
              stageName: deal.pipelineStage?.name,
              pipelineId: deal.pipelineId,
              pipelineName: deal.pipeline?.name,
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(moveDealStageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
