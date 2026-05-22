import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deal as dealTable, node as nodeTable, pipelineStage as pipelineStageTable } from "@/db/schema";
import { updatePipelineChannel } from "@/inngest/channels/update-pipeline";
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
          "Update Pipeline Node error: This workflow must be in an organization context."
        );
      }

      return {
        organizationId: node.workflow.organizationId,
        locationId: node.workflow.locationId,
      };
    });

    const dealId = decode(Handlebars.compile(data.dealId)(context));
    const pipelineStageId = decode(Handlebars.compile(data.pipelineStageId)(context));

    // Verify the pipeline stage exists and get the pipeline ID
    const pipelineStage = await step.run("verify-pipeline-stage", async () => {
      const stage = await db.query.pipelineStage.findFirst({
        where: eq(pipelineStageTable.id, pipelineStageId),
        with: {
          pipeline: {
            columns: {
              id: true,
              locationId: true,
            },
          },
        },
      });

      if (!stage) {
        throw new NonRetriableError(
          "Update Pipeline Node error: Pipeline stage not found."
        );
      }

      // Verify pipeline belongs to same context (location or organization)
      if (workflow.locationId) {
        if (stage.pipeline.locationId !== workflow.locationId) {
          throw new NonRetriableError(
            "Update Pipeline Node error: Pipeline stage does not belong to this location."
          );
        }
      }

      return stage;
    });

    const deal = await step.run("update-deal-stage", async () => {
      const dealWhere = and(
        eq(dealTable.id, dealId),
        workflow.locationId
          ? eq(dealTable.locationId, workflow.locationId)
          : eq(dealTable.organizationId, workflow.organizationId)
      );

      const [updatedDeal] = await db
        .update(dealTable)
        .set({
          pipelineId: pipelineStage.pipelineId,
          pipelineStageId,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(dealWhere)
        .returning({ id: dealTable.id });

      if (!updatedDeal) {
        throw new NonRetriableError(
          "Update Pipeline Node error: Deal not found in this workflow context."
        );
      }

      const reloadedDeal = await db.query.deal.findFirst({
        where: eq(dealTable.id, updatedDeal.id),
        with: {
          pipeline: true,
          pipelineStage: true,
        },
      });

      if (!reloadedDeal) {
        throw new NonRetriableError(
          "Update Pipeline Node error: Updated deal could not be loaded."
        );
      }

      return reloadedDeal;
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
        updatedAt: deal.updatedAt,
      },
    };
  } catch (error) {
    await publish(
      updatePipelineChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
