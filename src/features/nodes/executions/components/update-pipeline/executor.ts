import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { updatePipelineChannel } from "@/inngest/channels/update-pipeline";
import prisma from "@/lib/db";
import { decode } from "html-entities";

type UpdatePipelineData = {
  variableName?: string;
  dealId: string;
  pipelineStageId: string;
};

export const updatePipelineExecutor: NodeExecutor<
  UpdatePipelineData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    updatePipelineChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.variableName) {
      await publish(
        updatePipelineChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Update Pipeline Node error: No variable name has been set."
      );
    }

    if (!data.dealId) {
      await publish(
        updatePipelineChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Update Pipeline Node error: Deal ID is required."
      );
    }

    if (!data.pipelineStageId) {
      await publish(
        updatePipelineChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Update Pipeline Node error: Pipeline Stage ID is required."
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
          "Update Pipeline Node error: This workflow must be in an organization context."
        );
      }

      return node.Workflows;
    });

    const dealId = decode(Handlebars.compile(data.dealId)(context));
    const pipelineStageId = decode(Handlebars.compile(data.pipelineStageId)(context));

    // Verify the pipeline stage exists and get the pipeline ID
    const pipelineStage = await step.run("verify-pipeline-stage", async () => {
      const stage = await prisma.pipelineStage.findUnique({
        where: {
          id: pipelineStageId,
        },
        include: {
          pipeline: {
            select: {
              id: true,
              subaccountId: true,
            },
          },
        },
      });

      if (!stage) {
        throw new NonRetriableError(
          "Update Pipeline Node error: Pipeline stage not found."
        );
      }

      // Verify pipeline belongs to same context (subaccount or organization)
      if (workflow.subaccountId) {
        if (stage.pipeline.subaccountId !== workflow.subaccountId) {
          throw new NonRetriableError(
            "Update Pipeline Node error: Pipeline stage does not belong to this subaccount."
          );
        }
      }

      return stage;
    });

    const deal = await step.run("update-deal-stage", async () => {
      return await prisma.deal.update({
        where: {
          id: dealId,
          ...(workflow.subaccountId
            ? { subaccountId: workflow.subaccountId }
            : { organizationId: workflow.organizationId! }),
        },
        data: {
          pipelineId: pipelineStage.pipelineId,
          pipelineStageId: pipelineStageId,
          lastActivityAt: new Date(),
        },
        include: {
          pipeline: true,
          pipelineStage: true,
        },
      });
    });

    await publish(
      updatePipelineChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [data.variableName]: {
        id: deal.id,
        name: deal.name,
        pipelineId: deal.pipelineId,
        pipelineStageId: deal.pipelineStageId,
        pipelineName: deal.pipeline?.name,
        pipelineStageName: deal.pipelineStage?.name,
        updatedAt: typeof deal.updatedAt === 'string' ? deal.updatedAt : (deal.updatedAt as Date).toISOString(),
      },
    };
  } catch (error) {
    await publish(
      updatePipelineChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
