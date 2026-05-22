import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { deleteDealChannel } from "@/inngest/channels/delete-deal";
import { decode } from "html-entities";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { deal as dealTable, node as nodeTable } from "@/db/schema";

type DeleteDealData = {
  variableName?: string;
  dealId: string;
};

export const deleteDealExecutor: NodeExecutor<
  DeleteDealData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    deleteDealChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.variableName) {
      await publish(
        deleteDealChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Delete Deal Node error: No variable name has been set."
      );
    }

    if (!data.dealId) {
      await publish(
        deleteDealChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Delete Deal Node error: Deal ID is required."
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
          "Delete Deal Node error: This workflow must be in an organization context."
        );
      }

      return {
        organizationId: node.workflow.organizationId,
        locationId: node.workflow.locationId,
      };
    });

    const dealId = decode(Handlebars.compile(data.dealId)(context));

    const deletedDeal = await step.run("delete-deal", async () => {
      const [deleted] = await db
        .delete(dealTable)
        .where(
          and(
            eq(dealTable.id, dealId),
            workflow.locationId
              ? eq(dealTable.locationId, workflow.locationId)
              : eq(dealTable.organizationId, workflow.organizationId)
          )
        )
        .returning();

      if (!deleted) {
        throw new NonRetriableError(
          `Delete Deal Node error: Deal with ID ${dealId} not found.`
        );
      }

      return deleted;
    });

    await publish(
      deleteDealChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [data.variableName]: {
        deleted: true,
        deletedId: deletedDeal.id,
        deletedName: deletedDeal.name,
        deletedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    await publish(
      deleteDealChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
