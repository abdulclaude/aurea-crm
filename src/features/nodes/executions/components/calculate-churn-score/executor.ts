import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { calculateChurnScoreChannel } from "@/inngest/channels/calculate-churn-score";
import { ChurnRiskLevel } from "@/db/enums";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { checkIn, churnRiskScore, client as clientTable } from "@/db/schema";

type CalculateChurnScoreData = {
  clientId?: string;
};

export const calculateChurnScoreExecutor: NodeExecutor<
  CalculateChurnScoreData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    calculateChurnScoreChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.clientId) {
      await publish(
        calculateChurnScoreChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Calculate Churn Score error: clientId is required."
      );
    }

    const metrics = await step.run("gather-metrics", async () => {
      const client = await db.query.client.findFirst({
        where: eq(clientTable.id, data.clientId!),
        with: {
          checkIns: { orderBy: desc(checkIn.checkedInAt), limit: 1 },
          studioMemberships: {
            where: (membership, { eq }) => eq(membership.status, "ACTIVE"),
            columns: { id: true },
            limit: 1,
          },
        },
      });

      if (!client) {
        throw new NonRetriableError(
          `Calculate Churn Score error: Client ${data.clientId} not found.`
        );
      }

      const lastCheckIn = client.checkIns[0]?.checkedInAt ?? null;
      const daysSinceLastCheckIn = lastCheckIn
        ? Math.floor(
            (Date.now() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 90;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [recentCheckIns] = await db
        .select({ total: count() })
        .from(checkIn)
        .where(and(eq(checkIn.clientId, data.clientId!), gte(checkIn.checkedInAt, thirtyDaysAgo)));

      return {
        organizationId: client.organizationId,
        daysSinceLastCheckIn,
        currentStreak: client.currentStreak ?? 0,
        membershipActive: client.studioMemberships.length > 0,
        attendanceFrequency: recentCheckIns?.total ?? 0,
      };
    });

    const churnScore = await step.run("calculate-and-store", async () => {
      let score = 0;

      // Days since last check-in (0-40 points)
      score += Math.min(40, metrics.daysSinceLastCheckIn * 2);

      // Streak factor (0-20 points, inversely)
      score += Math.max(0, 20 - metrics.currentStreak * 4);

      // Membership status (0 or 15 points)
      if (!metrics.membershipActive) score += 15;

      // Attendance frequency (0-25 points, inversely)
      score += Math.max(0, 25 - metrics.attendanceFrequency * 5);

      score = Math.min(100, Math.max(0, score));

      const riskLevel =
        score >= 85
          ? ChurnRiskLevel.CRITICAL
          : score >= 70
            ? ChurnRiskLevel.HIGH
            : score >= 40
              ? ChurnRiskLevel.MEDIUM
              : ChurnRiskLevel.LOW;

      await db
        .insert(churnRiskScore)
        .values({
          id: createId(),
          organizationId: metrics.organizationId,
          clientId: data.clientId!,
          score,
          riskLevel,
          factors: {
            daysSinceLastCheckIn: metrics.daysSinceLastCheckIn,
            membershipActive: metrics.membershipActive,
            attendanceFrequency: metrics.attendanceFrequency,
            currentStreak: metrics.currentStreak,
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          calculatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [churnRiskScore.organizationId, churnRiskScore.clientId],
          set: {
            score,
            riskLevel,
            factors: {
              daysSinceLastCheckIn: metrics.daysSinceLastCheckIn,
              membershipActive: metrics.membershipActive,
              attendanceFrequency: metrics.attendanceFrequency,
              currentStreak: metrics.currentStreak,
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            calculatedAt: new Date(),
          },
        });

      return { score, riskLevel };
    });

    await publish(
      calculateChurnScoreChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      churnScore: churnScore.score,
      riskLevel: churnScore.riskLevel,
    };
  } catch (error) {
    await publish(
      calculateChurnScoreChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
