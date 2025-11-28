import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { deleteDealChannel } from "@/inngest/channels/delete-deal";
import prisma from "@/lib/db";
import { decode } from "html-entities";

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
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          workflow: {
            select: {
              subaccountId: true,
            },
          },
        },
      });

      if (!node?.workflow?.subaccountId) {
        throw new NonRetriableError(
          "Delete Deal Node error: This workflow must be in a subaccount context."
        );
      }

      return node.workflow;
    });

    const dealId = decode(Handlebars.compile(data.dealId)(context));

    const deletedDeal = await step.run("delete-deal", async () => {
      return await prisma.deal.delete({
        where: {
          id: dealId,
          subaccountId: workflow.subaccountId!,
        },
      });
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
