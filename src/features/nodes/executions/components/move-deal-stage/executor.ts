import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { moveDealStageChannel } from "@/inngest/channels/move-deal-stage";
import prisma from "@/lib/db";
import { decode } from "html-entities";

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
      const existingDeal = await prisma.deal.findUnique({
        where: { id: dealId },
      });

      if (!existingDeal) {
        throw new NonRetriableError(
          `Move Deal Stage Node error: Deal with ID ${dealId} not found.`
        );
      }

      // Verify pipeline stage exists
      const pipelineStage = await prisma.pipelineStage.findUnique({
        where: { id: pipelineStageId },
        include: { pipeline: true },
      });

      if (!pipelineStage) {
        throw new NonRetriableError(
          `Move Deal Stage Node error: Pipeline Stage with ID ${pipelineStageId} not found.`
        );
      }

      return await prisma.deal.update({
        where: { id: dealId },
        data: {
          pipelineStageId: pipelineStageId,
          pipelineId: pipelineStage.pipelineId,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          pipelineStage: true,
          pipeline: true,
        },
      });
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
