import { inngest } from "../client";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db";
import { churnRiskScore, client, organization } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

function calculateChurnScore(member: {
  attendanceCount: number;
  currentStreak: number;
  lastInteractionAt: Date | null;
  createdAt: Date;
  studioMemberships: Array<{ status: string; usedClasses: number | null; totalClasses: number | null }>;
}): { score: number; riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; factors: Record<string, unknown> } {
  let score = 0;
  const factors: Record<string, unknown> = {};

  const daysSinceLastVisit = member.lastInteractionAt
    ? Math.floor((Date.now() - member.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastVisit > 30) { score += 40; factors.inactiveDays = daysSinceLastVisit; }
  else if (daysSinceLastVisit > 14) { score += 25; factors.inactiveDays = daysSinceLastVisit; }
  else if (daysSinceLastVisit > 7) { score += 10; factors.inactiveDays = daysSinceLastVisit; }

  if (member.currentStreak === 0 && member.attendanceCount > 5) {
    score += 15;
    factors.streakBroken = true;
  }

  const activeMembership = member.studioMemberships.find((m) => m.status === "ACTIVE");
  if (!activeMembership) { score += 20; factors.noActiveMembership = true; }
  else if (activeMembership.totalClasses && (activeMembership.usedClasses ?? 0) > 0) {
    const usageRate = (activeMembership.usedClasses ?? 0) / activeMembership.totalClasses;
    if (usageRate < 0.3) { score += 15; factors.lowUsageRate = usageRate; }
  }

  const memberAgeDays = Math.floor((Date.now() - member.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (memberAgeDays < 30 && member.attendanceCount < 3) {
    score += 10;
    factors.newMemberLowEngagement = true;
  }

  score = Math.min(score, 100);
  const riskLevel = score >= 75 ? "CRITICAL" as const
    : score >= 50 ? "HIGH" as const
    : score >= 25 ? "MEDIUM" as const
    : "LOW" as const;

  return { score, riskLevel, factors };
}

export const calculateChurnScores = inngest.createFunction(
  { id: "calculate-churn-scores", retries: 0 },
  { cron: "0 3 * * 0" },
  async () => {
    const orgs = await db.select({ id: organization.id }).from(organization);

    let totalProcessed = 0;

    for (const org of orgs) {
      const members = await db.query.client.findMany({
        where: (clientTable, { and, eq }) =>
          and(
            eq(clientTable.organizationId, org.id),
            inArray(clientTable.type, ["CUSTOMER", "PROSPECT"])
          ),
        columns: {
          id: true,
          attendanceCount: true,
          currentStreak: true,
          lastInteractionAt: true,
          createdAt: true,
        },
        with: {
          studioMemberships: {
            columns: { status: true, usedClasses: true, totalClasses: true },
          },
        },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      for (const member of members) {
        const { score, riskLevel, factors } = calculateChurnScore(member);

        const suggestedActions: string[] = [];
        if (factors.inactiveDays && Number(factors.inactiveDays) > 14) {
          suggestedActions.push("Send a personalized 'We miss you' message");
        }
        if (factors.streakBroken) {
          suggestedActions.push("Encourage them to restart their streak");
        }
        if (factors.noActiveMembership) {
          suggestedActions.push("Offer a special re-enrollment discount");
        }
        if (factors.lowUsageRate) {
          suggestedActions.push("Suggest different class types for their schedule");
        }
        if (riskLevel === "CRITICAL") {
          suggestedActions.push("Assign staff for personal outreach within 24 hours");
        }

        await db
          .insert(churnRiskScore)
          .values({
            id: createId(),
            organizationId: org.id,
            clientId: member.id,
            score,
            riskLevel,
            factors,
            suggestedActions,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: [churnRiskScore.organizationId, churnRiskScore.clientId],
            set: {
            score,
            riskLevel,
            factors,
            suggestedActions,
            calculatedAt: new Date(),
            expiresAt,
            },
          });
        totalProcessed++;
      }
    }

    return { totalProcessed };
  },
);
