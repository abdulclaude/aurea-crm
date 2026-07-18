import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { checkIn, churnRiskScore, client } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  calculateChurnScore,
  getSuggestedChurnActions,
} from "@/features/churn/lib/churn-score";

function exactLocation(column: AnyPgColumn, locationId: string | null) {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

async function requireChurnAccess(
  ctx: {
    auth: { user: { id: string } };
    orgId: string | null;
    locationId: string | null;
  },
  capability: "customer.view" | "customer.manage",
): Promise<string> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization to view retention risk.",
    });
  }
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
  });
  return ctx.orgId;
}

export const churnRouter = createTRPCRouter({
  getScores: protectedProcedure
    .input(z.object({
      riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireChurnAccess(ctx, "customer.view");

      return db
        .select({
          id: churnRiskScore.id,
          organizationId: churnRiskScore.organizationId,
          locationId: churnRiskScore.locationId,
          clientId: churnRiskScore.clientId,
          score: churnRiskScore.score,
          riskLevel: churnRiskScore.riskLevel,
          factors: churnRiskScore.factors,
          suggestedActions: churnRiskScore.suggestedActions,
          calculatedAt: churnRiskScore.calculatedAt,
          expiresAt: churnRiskScore.expiresAt,
          clientName: client.name,
          lastInteractionAt: client.lastInteractionAt,
        })
        .from(churnRiskScore)
        .innerJoin(
          client,
          and(
            eq(client.id, churnRiskScore.clientId),
            eq(client.organizationId, organizationId),
            exactLocation(client.locationId, ctx.locationId),
          ),
        )
        .where(
          and(
            eq(churnRiskScore.organizationId, organizationId),
            exactLocation(churnRiskScore.locationId, ctx.locationId),
            input.riskLevel
              ? eq(churnRiskScore.riskLevel, input.riskLevel)
              : undefined,
          ),
        )
        .orderBy(desc(churnRiskScore.score))
        .limit(input.limit);
    }),

  calculateForAll: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await requireChurnAccess(ctx, "customer.manage");
    const now = new Date();

    const members = await db.query.client.findMany({
      where: and(
        eq(client.organizationId, organizationId),
        exactLocation(client.locationId, ctx.locationId),
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
            .where(
              and(
                eq(checkIn.organizationId, organizationId),
                exactLocation(checkIn.locationId, ctx.locationId),
                inArray(checkIn.clientId, memberIds),
              ),
            )
            .orderBy(desc(checkIn.checkedInAt))
        : [];
    const checkInMap = new Map<string, Date>();
    for (const checkInRow of recentCheckIns) {
      if (!checkInMap.has(checkInRow.clientId)) {
        checkInMap.set(checkInRow.clientId, checkInRow.checkedInAt);
      }
    }

    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);

    const rows = members.map((member) => {
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
      const { score, riskLevel, factors } = calculateChurnScore(
        enrichedMember,
        now,
      );
      const suggestedActions = getSuggestedChurnActions(riskLevel, factors);

      return {
        id: createId(),
        organizationId,
        locationId: ctx.locationId,
        clientId: member.id,
        score,
        riskLevel,
        factors,
        suggestedActions,
        calculatedAt: now,
        expiresAt,
      } satisfies typeof churnRiskScore.$inferInsert;
    });

    if (rows.length > 0) {
      await db
        .insert(churnRiskScore)
        .values(rows)
        .onConflictDoUpdate({
          target: [churnRiskScore.organizationId, churnRiskScore.clientId],
          set: {
            locationId: sql`excluded."locationId"`,
            score: sql`excluded."score"`,
            riskLevel: sql`excluded."riskLevel"`,
            factors: sql`excluded."factors"`,
            suggestedActions: sql`excluded."suggestedActions"`,
            calculatedAt: sql`excluded."calculatedAt"`,
            expiresAt: sql`excluded."expiresAt"`,
          },
        });
    }

    return { processed: rows.length };
  }),

  getForClient: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireChurnAccess(ctx, "customer.view");

      return db.query.churnRiskScore.findFirst({
        where: and(
          eq(churnRiskScore.organizationId, organizationId),
          exactLocation(churnRiskScore.locationId, ctx.locationId),
          eq(churnRiskScore.clientId, input.clientId),
        ),
      });
    }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await requireChurnAccess(ctx, "customer.view");

    const scores = await db
      .select({ riskLevel: churnRiskScore.riskLevel, total: count() })
      .from(churnRiskScore)
      .where(
        and(
          eq(churnRiskScore.organizationId, organizationId),
          exactLocation(churnRiskScore.locationId, ctx.locationId),
        ),
      )
      .groupBy(churnRiskScore.riskLevel);

    const summary = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const s of scores) {
      summary[s.riskLevel] = s.total;
    }

    return summary;
  }),
});
