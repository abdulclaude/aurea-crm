import type { NodeExecutor } from "@/features/executions/types";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { awardLoyaltyPointsChannel } from "@/inngest/channels/award-loyalty-points";
import { LoyaltyTransactionType } from "@/db/enums";
import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { loyaltyBalance, loyaltyTransaction, node as nodeTable } from "@/db/schema";

type AwardLoyaltyPointsData = {
  clientId?: string;
  points?: number;
  type?: string;
  description?: string;
};

export const awardLoyaltyPointsExecutor: NodeExecutor<
  AwardLoyaltyPointsData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    awardLoyaltyPointsChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.clientId || !data.points) {
      await publish(
        awardLoyaltyPointsChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Award Loyalty Points error: clientId and points are required."
      );
    }

    const workflow = await step.run("get-workflow-context", async () => {
      const node = await db.query.node.findFirst({
        where: eq(nodeTable.id, nodeId),
        with: {
          workflow: { columns: { organizationId: true, locationId: true } },
        },
      });

      if (!node?.workflow?.organizationId) {
        throw new NonRetriableError(
          "Award Loyalty Points error: Workflow must be in an organization context."
        );
      }

      return {
        organizationId: node.workflow.organizationId,
        locationId: node.workflow.locationId,
      };
    });

    const clientId = Handlebars.compile(data.clientId)(context);
    const description = data.description
      ? Handlebars.compile(data.description)(context)
      : "Points awarded via workflow";

    const result = await step.run("award-points", async () => {
      const { balance, transaction } = await db.transaction(async (tx) => {
        const [updatedBalance] = await tx
          .insert(loyaltyBalance)
          .values({
            id: createId(),
            clientId,
            organizationId: workflow.organizationId,
            points: data.points!,
            lifetimePoints: Math.max(0, data.points!),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [loyaltyBalance.organizationId, loyaltyBalance.clientId],
            set: {
              points: sql`${loyaltyBalance.points} + ${data.points!}`,
              ...(data.points! > 0
                ? { lifetimePoints: sql`${loyaltyBalance.lifetimePoints} + ${data.points!}` }
                : {}),
              updatedAt: new Date(),
            },
          })
          .returning();

        const [createdTransaction] = await tx
          .insert(loyaltyTransaction)
          .values({
            id: createId(),
            clientId,
            organizationId: workflow.organizationId,
            points: data.points!,
            type:
              data.type && data.type in LoyaltyTransactionType
                ? LoyaltyTransactionType[
                    data.type as keyof typeof LoyaltyTransactionType
                  ]
                : LoyaltyTransactionType.ADJUST,
            description,
          })
          .returning();

        return { balance: updatedBalance, transaction: createdTransaction };
      });

      return { newBalance: balance.points, transactionId: transaction.id };
    });

    await publish(
      awardLoyaltyPointsChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      pointsAwarded: data.points,
      newBalance: result.newBalance,
    };
  } catch (error) {
    await publish(
      awardLoyaltyPointsChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
