import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { checkIn, churnRiskScore, client } from "@/db/schema";

function calculateChurnScore(member: {
  attendanceCount: number;
  currentStreak: number;
  lastInteractionAt: Date | null;
  createdAt: Date;
  studioMembership: Array<{ status: string; usedClasses: number | null; totalClasses: number | null }>;
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

  const activeMembership = member.studioMembership.find((m) => m.status === "ACTIVE");
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

function getSuggestedActions(riskLevel: string, factors: Record<string, unknown>): string[] {
  const actions: string[] = [];

  if (factors.inactiveDays && Number(factors.inactiveDays) > 14) {
    actions.push("Send a personalized 'We miss you' message with a class recommendation");
  }
  if (factors.streakBroken) {
    actions.push("Encourage them to restart their streak with a motivational message");
  }
  if (factors.noActiveMembership) {
    actions.push("Offer a special re-enrollment discount or intro offer");
  }
  if (factors.lowUsageRate) {
    actions.push("Suggest different class types that might better fit their schedule");
  }
  if (factors.newMemberLowEngagement) {
    actions.push("Schedule a personal check-in call to ensure they feel welcome");
  }

  if (riskLevel === "CRITICAL") {
    actions.push("Assign a staff member for personal outreach within 24 hours");
  } else if (riskLevel === "HIGH") {
    actions.push("Create a follow-up task for the team to reach out this week");
  }

  return actions;
}

export const churnRouter = createTRPCRouter({
  getScores: protectedProcedure
    .input(z.object({
      riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const scores = await db.query.churnRiskScore.findMany({
        where: and(
          eq(churnRiskScore.organizationId, ctx.orgId),
          ...(input.riskLevel ? [eq(churnRiskScore.riskLevel, input.riskLevel)] : [])
        ),
        limit: input.limit,
        orderBy: desc(churnRiskScore.score),
      });

      const clientIds = scores.map((s) => s.clientId);
      const clients =
        clientIds.length > 0
          ? await db.query.client.findMany({
              where: inArray(client.id, clientIds),
              columns: { id: true, name: true, lastInteractionAt: true },
            })
          : [];
      const clientMap = new Map(clients.map((item) => [item.id, item]));

      return scores.map((s) => ({
        ...s,
        clientName: clientMap.get(s.clientId)?.name ?? null,
        lastInteractionAt: clientMap.get(s.clientId)?.lastInteractionAt ?? null,
      }));
    }),

  calculateForAll: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const members = await db.query.client.findMany({
      where: and(
        eq(client.organizationId, ctx.orgId),
        ...(ctx.locationId ? [eq(client.locationId, ctx.locationId)] : []),
        inArray(client.type, ["CUSTOMER", "PROSPECT"])
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

    // Get most recent actual check-in per client (more accurate than stored lastInteractionAt)
    const memberIds = members.map((member) => member.id);
    const recentCheckIns =
      memberIds.length > 0
        ? await db
            .select({ clientId: checkIn.clientId, checkedInAt: checkIn.checkedInAt })
            .from(checkIn)
            .where(and(eq(checkIn.organizationId, ctx.orgId), inArray(checkIn.clientId, memberIds)))
            .orderBy(desc(checkIn.checkedInAt))
        : [];
    const checkInMap = new Map<string, Date>();
    for (const checkInRow of recentCheckIns) {
      if (!checkInMap.has(checkInRow.clientId)) {
        checkInMap.set(checkInRow.clientId, checkInRow.checkedInAt);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    let processed = 0;
    for (const member of members) {
      // Use the most recent of stored lastInteractionAt vs actual check-in
      const actualLastSeen = checkInMap.get(member.id) ?? null;
      const effectiveLastSeen = actualLastSeen && member.lastInteractionAt
        ? new Date(Math.max(actualLastSeen.getTime(), member.lastInteractionAt.getTime()))
        : actualLastSeen ?? member.lastInteractionAt;

      const { studioMemberships, ...memberFields } = member;
      const enrichedMember = {
        ...memberFields,
        studioMembership: studioMemberships,
        lastInteractionAt: effectiveLastSeen,
      };
      const { score, riskLevel, factors } = calculateChurnScore(enrichedMember);
      const suggestedActions = getSuggestedActions(riskLevel, factors);

      await db
        .insert(churnRiskScore)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
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
      processed++;
    }

    return { processed };
  }),

  getForClient: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      return db.query.churnRiskScore.findFirst({
        where: and(eq(churnRiskScore.organizationId, ctx.orgId), eq(churnRiskScore.clientId, input.clientId)),
      });
    }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const scores = await db
      .select({ riskLevel: churnRiskScore.riskLevel, total: count() })
      .from(churnRiskScore)
      .where(eq(churnRiskScore.organizationId, ctx.orgId))
      .groupBy(churnRiskScore.riskLevel);

    const summary = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const s of scores) {
      summary[s.riskLevel] = s.total;
    }

    return summary;
  }),
});
