import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, count, desc, eq, gte, inArray, isNull, lt, lte, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  instructorPayout,
  studioMembership,
  studioPayment,
  studioPaymentLineItem,
  studioProduct,
} from "@/db/schema";
import { readThroughRedisCache } from "@/lib/redis/read-through-cache";

const scopedConditions = <T extends { organizationId: typeof studioPayment.organizationId; locationId: typeof studioPayment.locationId }>({
  table,
  organizationId,
  locationId,
}: {
  table: T;
  organizationId: string;
  locationId: string | null;
}): SQL[] => [
  eq(table.organizationId, organizationId),
  ...(locationId ? [eq(table.locationId, locationId)] : []),
];

function percentageChange(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function dayKey(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function buildDailySeries({
  startDate,
  endDate,
  values,
}: {
  startDate: Date;
  endDate: Date;
  values: Record<string, number>;
}): { date: string; amount: number }[] {
  const rows: { date: string; amount: number }[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const date = dayKey(cursor);
    rows.push({
      date,
      amount: Math.round((values[date] ?? 0) * 100) / 100,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

export const revenueRouter = createTRPCRouter({
  overview: protectedProcedure
    .input(
      z.object({
        start: z.coerce.date().optional(),
        end: z.coerce.date().optional(),
        days: z.number().int().min(1).max(20_000).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const orgId = ctx.orgId;
      const now = new Date();
      const endDate = input.end ?? now;
      const daysBack = input.days ?? (Math.max(1, Math.ceil((endDate.getTime() - (input.start?.getTime() ?? endDate.getTime())) / 86_400_000)) || 30);
      const startDate = input.start ?? new Date(endDate.getTime() - daysBack * 86_400_000);
      const prevStart = new Date(startDate.getTime() - daysBack * 86_400_000);
      return readThroughRedisCache({
        key: [
          "revenue",
          "v1",
          "overview",
          orgId,
          ctx.locationId ?? "organization",
          startDate.toISOString(),
          endDate.toISOString(),
          String(daysBack),
        ].join(":"),
        ttlSeconds: 2 * 60,
        loader: async () => {
          const paymentScope = scopedConditions({
        table: studioPayment,
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
      });
      const membershipScope = [
        eq(studioMembership.organizationId, orgId),
        ...(ctx.locationId ? [eq(studioMembership.locationId, ctx.locationId)] : []),
      ];
      const payoutScope = [
        eq(instructorPayout.organizationId, orgId),
        ...(ctx.locationId ? [eq(instructorPayout.locationId, ctx.locationId)] : []),
      ];

      const [currentPayments, prevPayments, activeMemberships, instructorPayouts, prevInstructorPayouts] = await Promise.all([
        db.query.studioPayment.findMany({
          where: and(
            ...paymentScope,
            eq(studioPayment.status, "SUCCEEDED"),
            gte(studioPayment.createdAt, startDate),
            lte(studioPayment.createdAt, endDate),
          ),
          columns: { amount: true, type: true, createdAt: true, currency: true },
        }),
        db.query.studioPayment.findMany({
          where: and(
            ...paymentScope,
            eq(studioPayment.status, "SUCCEEDED"),
            gte(studioPayment.createdAt, prevStart),
            lt(studioPayment.createdAt, startDate)
          ),
          columns: { amount: true },
        }),
        db
          .select({ total: count() })
          .from(studioMembership)
          .where(and(...membershipScope, eq(studioMembership.status, "ACTIVE"))),
        db.query.instructorPayout.findMany({
          where: and(
            ...payoutScope,
            inArray(instructorPayout.status, ["PAID", "PROCESSING"]),
            gte(instructorPayout.createdAt, startDate),
            lte(instructorPayout.createdAt, endDate),
          ),
          columns: { amount: true, createdAt: true },
        }),
        db.query.instructorPayout.findMany({
          where: and(
            ...payoutScope,
            inArray(instructorPayout.status, ["PAID", "PROCESSING"]),
            gte(instructorPayout.createdAt, prevStart),
            lt(instructorPayout.createdAt, startDate),
          ),
          columns: { amount: true },
        }),
      ]);
      const currentLineItems = await db
        .select({
          amount: studioPaymentLineItem.amount,
          productType: studioProduct.type,
        })
        .from(studioPaymentLineItem)
        .leftJoin(studioProduct, eq(studioPaymentLineItem.productId, studioProduct.id))
        .where(
          and(
            eq(studioPaymentLineItem.organizationId, orgId),
            ctx.locationId ? eq(studioPaymentLineItem.locationId, ctx.locationId) : undefined,
            isNull(studioPaymentLineItem.deletedAt),
            gte(studioPaymentLineItem.soldAt, startDate),
            lte(studioPaymentLineItem.soldAt, endDate),
          ),
        );

      const totalRevenue = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const prevRevenue = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalPayouts = instructorPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
      const prevPayouts = prevInstructorPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
      const netRevenue = totalRevenue - totalPayouts;
      const prevNetRevenue = prevRevenue - prevPayouts;
      const activeMembershipCount = activeMemberships[0]?.total ?? 0;
      const arpm = activeMembershipCount > 0
        ? Math.round((totalRevenue / activeMembershipCount) * 100) / 100
        : 0;
      const prevArpm = activeMembershipCount > 0
        ? Math.round((prevRevenue / activeMembershipCount) * 100) / 100
        : 0;

      const revenueChange = percentageChange(totalRevenue, prevRevenue);
      const netRevenueChange = percentageChange(netRevenue, prevNetRevenue);
      const arpmChange = percentageChange(arpm, prevArpm);
      const transactionChange = percentageChange(currentPayments.length, prevPayments.length);

      const byType: Record<string, number> = {};
      if (currentLineItems.length > 0) {
        for (const lineItem of currentLineItems) {
          const type = lineItem.productType ?? "POS";
          byType[type] = (byType[type] ?? 0) + Number(lineItem.amount);
        }
      } else {
        for (const p of currentPayments) {
          byType[p.type] = (byType[p.type] ?? 0) + Number(p.amount);
        }
      }

      const dailyRevenue: Record<string, number> = {};
      const dailyPayouts: Record<string, number> = {};
      const dailyTransactions: Record<string, number> = {};
      for (const p of currentPayments) {
        const day = dayKey(p.createdAt);
        dailyRevenue[day] = (dailyRevenue[day] ?? 0) + Number(p.amount);
        dailyTransactions[day] = (dailyTransactions[day] ?? 0) + 1;
      }
      for (const payout of instructorPayouts) {
        const day = dayKey(payout.createdAt);
        dailyPayouts[day] = (dailyPayouts[day] ?? 0) + Number(payout.amount);
      }

      const dailyNetRevenue: Record<string, number> = {};
      const dailyArpm: Record<string, number> = {};
      for (const item of buildDailySeries({ startDate, endDate, values: dailyRevenue })) {
        const payoutAmount = dailyPayouts[item.date] ?? 0;
        dailyNetRevenue[item.date] = item.amount - payoutAmount;
        dailyArpm[item.date] = activeMembershipCount > 0
          ? item.amount / activeMembershipCount
          : 0;
      }

          return {
            totalRevenue,
            netRevenue,
            totalPayouts,
            revenueChange,
            netRevenueChange,
            arpmChange,
            transactionChange,
            transactionCount: currentPayments.length,
            activeMemberships: activeMembershipCount,
            arpm,
            byType,
            dailyRevenue: buildDailySeries({ startDate, endDate, values: dailyRevenue }),
            dailyNetRevenue: buildDailySeries({ startDate, endDate, values: dailyNetRevenue }),
            dailyArpm: buildDailySeries({ startDate, endDate, values: dailyArpm }),
            dailyTransactions: buildDailySeries({ startDate, endDate, values: dailyTransactions })
              .map((item) => ({ date: item.date, count: item.amount })),
            currency: currentPayments[0]?.currency ?? "GBP",
          };
        },
      });
    }),

  transactions: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        start: z.coerce.date().optional(),
        end: z.coerce.date().optional(),
        days: z.number().int().min(1).max(20_000).optional(),
        type: z.enum(["MEMBERSHIP", "CLASS_PACK", "DROP_IN", "GIFT_CARD", "POS"]).optional(),
        status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "CANCELLED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const conditions: SQL[] = [
        ...scopedConditions({
          table: studioPayment,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
        }),
        isNull(studioPayment.deletedAt),
      ];
      const endDate = input.end ?? new Date();
      const daysBack = input.days ?? (Math.max(1, Math.ceil((endDate.getTime() - (input.start?.getTime() ?? endDate.getTime())) / 86_400_000)) || 30);
      const startDate = input.start ?? new Date(endDate.getTime() - daysBack * 86_400_000);
      conditions.push(gte(studioPayment.createdAt, startDate));
      if (input.end) conditions.push(lte(studioPayment.createdAt, endDate));
      if (input.type) conditions.push(eq(studioPayment.type, input.type));
      if (input.status) conditions.push(eq(studioPayment.status, input.status));
      if (input.cursor) {
        const cursor = await db.query.studioPayment.findFirst({
          where: eq(studioPayment.id, input.cursor),
          columns: { id: true, createdAt: true },
        });
        if (cursor) {
          conditions.push(
            or(
              lt(studioPayment.createdAt, cursor.createdAt),
              and(eq(studioPayment.createdAt, cursor.createdAt), lt(studioPayment.id, cursor.id))
            )!
          );
        }
      }

      const rows = await db.query.studioPayment.findMany({
        where: and(...conditions),
        with: {
          client: { columns: { name: true, email: true, phone: true } },
          studioMembership: {
            columns: {},
            with: { membershipPlan: { columns: { name: true } } },
          },
        },
        limit: input.limit + 1,
        orderBy: [desc(studioPayment.createdAt), desc(studioPayment.id)],
      });
      const payments = rows.map(({ studioMembership, ...payment }) => ({
        ...payment,
        membership: studioMembership,
      }));

      const hasMore = payments.length > input.limit;
      if (hasMore) payments.pop();

      return {
        payments,
        nextCursor: hasMore ? payments[payments.length - 1]?.id : undefined,
      };
    }),
});
