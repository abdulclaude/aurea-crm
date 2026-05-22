import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  min,
  ne,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  activity,
  automationEvent,
  campaign,
  checkIn,
  classWaitlist,
  classType,
  client,
  instructor,
  membershipPlan,
  referral,
  studioClass,
  studioBooking,
  studioMembership,
  studioPayment,
} from "@/db/schema";
import { readThroughRedisCache } from "@/lib/redis/read-through-cache";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function requireOrg(ctx: { orgId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }
  return ctx.orgId;
}

function classScope(orgId: string, locationId: string | null) {
  return [
    eq(studioClass.organizationId, orgId),
    locationId ? eq(studioClass.locationId, locationId) : undefined,
  ];
}

function membershipScope(orgId: string, locationId: string | null) {
  return [
    eq(studioMembership.organizationId, orgId),
    locationId ? eq(studioMembership.locationId, locationId) : undefined,
  ];
}

function clientScope(orgId: string, locationId: string | null) {
  return [
    eq(client.organizationId, orgId),
    locationId ? eq(client.locationId, locationId) : undefined,
  ];
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

const rangeInputSchema = z
  .object({
    days: z.number().int().min(1).max(20_000).default(30),
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
  })
  .optional();

type RangeInput = z.infer<typeof rangeInputSchema>;
type DashboardCacheContext = {
  orgId: string | null;
  locationId: string | null;
};

const DASHBOARD_RANGE_CACHE_SECONDS = 2 * 60;
const DASHBOARD_METADATA_CACHE_SECONDS = 10 * 60;

function resolveRange(input: RangeInput): { start: Date; end: Date; days: number; label: string } {
  const end = input?.end ?? new Date();
  const start =
    input?.start ??
    new Date(end.getTime() - (input?.days ?? 30) * 24 * 60 * 60 * 1000);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  return {
    start,
    end,
    days,
    label: days <= 31 && start.getDate() === 1 ? "current month" : `last ${days} days`,
  };
}

function dashboardCacheKey({
  metric,
  orgId,
  locationId,
  parts = [],
}: {
  metric: string;
  orgId: string;
  locationId: string | null;
  parts?: string[];
}): string {
  return [
    "studio-dashboard",
    "v1",
    metric,
    orgId,
    locationId ?? "organization",
    ...parts,
  ].join(":");
}

function cacheDashboardRangeMetric<T>({
  ctx,
  input,
  metric,
  loader,
}: {
  ctx: DashboardCacheContext;
  input: RangeInput;
  metric: string;
  loader: (
    orgId: string,
    range: ReturnType<typeof resolveRange>,
  ) => Promise<T>;
}): Promise<T> {
  const orgId = requireOrg(ctx);
  const range = resolveRange(input);

  return readThroughRedisCache({
    key: dashboardCacheKey({
      metric,
      orgId,
      locationId: ctx.locationId,
      parts: [
        range.start.toISOString(),
        range.end.toISOString(),
        String(range.days),
      ],
    }),
    ttlSeconds: DASHBOARD_RANGE_CACHE_SECONDS,
    loader: () => loader(orgId, range),
  });
}

function cacheDashboardMetric<T>({
  ctx,
  metric,
  ttlSeconds = DASHBOARD_RANGE_CACHE_SECONDS,
  loader,
}: {
  ctx: DashboardCacheContext;
  metric: string;
  ttlSeconds?: number;
  loader: (orgId: string) => Promise<T>;
}): Promise<T> {
  const orgId = requireOrg(ctx);

  return readThroughRedisCache({
    key: dashboardCacheKey({
      metric,
      orgId,
      locationId: ctx.locationId,
    }),
    ttlSeconds,
    loader: () => loader(orgId),
  });
}

function previousRange(range: { start: Date; end: Date }) {
  const duration = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - duration),
    end: range.start,
  };
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function changePct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type Granularity = "day" | "week" | "month";

function pickGranularity(days: number): Granularity {
  if (days <= 60) return "day";
  if (days <= 365) return "week";
  return "month";
}

function truncInterval(gran: Granularity): string {
  if (gran === "week") return "week";
  if (gran === "month") return "month";
  return "day";
}

function bucketSqlParts(gran: Granularity): {
  interval: SQL;
  format: SQL;
} {
  const format = gran === "month" ? "YYYY-MM" : "YYYY-MM-DD";
  return {
    interval: sql.raw(`'${truncInterval(gran)}'`),
    format: sql.raw(`'${format}'`),
  };
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekKey(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === "week") return weekKey(date);
  if (granularity === "month") return monthKey(date);
  return dayKey(date);
}

function dayLabel(key: string): string {
  const date = new Date(`${key}T00:00:00`);
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function weekLabel(key: string): string {
  const date = new Date(`${key}T00:00:00`);
  return `w/c ${date.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function ordinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function fullDateLabel(date: Date): string {
  const monthYear = date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  return `${ordinal(date.getDate())} ${monthYear}`;
}

function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "week") return weekLabel(key);
  if (granularity === "month") return monthLabel(key);
  return dayLabel(key);
}

function bucketFullLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }

  const start = new Date(`${key}T00:00:00`);
  if (granularity === "week") {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `Week of ${fullDateLabel(start)} - ${fullDateLabel(end)}`;
  }

  return fullDateLabel(start);
}

function dailyKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor < end) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function bucketKeys(start: Date, end: Date, granularity: Granularity): string[] {
  if (granularity === "day") return dailyKeys(start, end);
  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor < end) {
    const k = bucketKey(cursor, granularity);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
    cursor.setDate(cursor.getDate() + (granularity === "week" ? 7 : 28));
  }
  const lastKey = bucketKey(new Date(end.getTime() - 1), granularity);
  if (!seen.has(lastKey)) keys.push(lastKey);
  return keys;
}

function bookingScope(
  orgId: string,
  locationId: string | null,
  start: Date,
  end: Date,
): SQL {
  return and(
    eq(studioClass.organizationId, orgId),
    locationId ? eq(studioClass.locationId, locationId) : undefined,
    gte(studioClass.startTime, start),
    lt(studioClass.startTime, end),
  )!;
}

function activityLabel(row: {
  action: string;
  entityName: string | null;
  entityType: string;
}) {
  const entityName = row.entityName ?? row.entityType.toLowerCase();
  return `${row.action.toLowerCase().replaceAll("_", " ")} ${entityName}`;
}

export const studioDashboardRouter = createTRPCRouter({
  summaryStats: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "summary-stats",
        loader: async (orgId, range) => {
          const previous = previousRange(range);
          const { start: todayStart, end: todayEnd } = todayRange();

          const [
            activeMemberships,
            previousActiveMemberships,
            todayClasses,
            previousTodayClasses,
            todayCheckIns,
            previousTodayCheckIns,
            rangeCheckIns,
            previousRangeCheckIns,
          ] = await Promise.all([
        db
          .select({ total: count() })
          .from(studioMembership)
          .where(
            and(
              ...membershipScope(orgId, ctx.locationId),
              eq(studioMembership.status, "ACTIVE")
            )
          ),
        db
          .select({ total: count() })
          .from(studioMembership)
          .where(
            and(
              ...membershipScope(orgId, ctx.locationId),
              eq(studioMembership.status, "ACTIVE"),
              lt(studioMembership.createdAt, previous.end),
            )
          ),
        db
          .select({ total: count() })
          .from(studioClass)
          .where(
            and(
              ...classScope(orgId, ctx.locationId),
              gte(studioClass.startTime, todayStart),
              lt(studioClass.startTime, todayEnd)
            )
          ),
        db
          .select({ total: count() })
          .from(studioClass)
          .where(
            and(
              ...classScope(orgId, ctx.locationId),
              gte(studioClass.startTime, previous.start),
              lt(studioClass.startTime, previous.end)
            )
          ),
        db
          .select({ total: count() })
          .from(checkIn)
          .where(
            and(
              eq(checkIn.organizationId, orgId),
              ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
              gte(checkIn.checkedInAt, todayStart),
              lt(checkIn.checkedInAt, todayEnd)
            )
          ),
        db
          .select({ total: count() })
          .from(checkIn)
          .where(
            and(
              eq(checkIn.organizationId, orgId),
              ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
              gte(checkIn.checkedInAt, previous.start),
              lt(checkIn.checkedInAt, previous.end)
            )
          ),
        db
          .select({ total: count() })
          .from(checkIn)
          .where(
            and(
              eq(checkIn.organizationId, orgId),
              ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
              gte(checkIn.checkedInAt, range.start),
              lt(checkIn.checkedInAt, range.end)
            )
          ),
        db
          .select({ total: count() })
          .from(checkIn)
          .where(
            and(
              eq(checkIn.organizationId, orgId),
              ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
              gte(checkIn.checkedInAt, previous.start),
              lt(checkIn.checkedInAt, previous.end)
            )
          ),
          ]);

          const activeCount = activeMemberships[0]?.total ?? 0;
          const todayClassCount = todayClasses[0]?.total ?? 0;
          const todayCheckInCount = todayCheckIns[0]?.total ?? 0;
          const rangeCheckInCount = rangeCheckIns[0]?.total ?? 0;

          return {
            activeMemberships: activeCount,
            todayClasses: todayClassCount,
            todayCheckIns: todayCheckInCount,
            monthCheckIns: rangeCheckInCount,
            rangeLabel: range.label,
            membershipsChange: changePct(
              activeCount,
              previousActiveMemberships[0]?.total ?? 0,
            ),
            classesChange: changePct(
              todayClassCount,
              previousTodayClasses[0]?.total ?? 0,
            ),
            checkInsChange: changePct(
              todayCheckInCount,
              previousTodayCheckIns[0]?.total ?? 0,
            ),
            visitsChange: changePct(
              rangeCheckInCount,
              previousRangeCheckIns[0]?.total ?? 0,
            ),
          };
        },
      }),
    ),

  visitsOverTime: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "visits-over-time",
        loader: async (orgId, range) => {
      const gran = pickGranularity(range.days);
      const { interval, format } = bucketSqlParts(gran);
      const bucket = sql<string>`to_char(date_trunc(${interval}, ${checkIn.checkedInAt}), ${format})`;
      const rows = await db
        .select({
          bucket,
          total: count(),
        })
        .from(checkIn)
        .where(
          and(
            eq(checkIn.organizationId, orgId),
            ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
            gte(checkIn.checkedInAt, range.start),
            lt(checkIn.checkedInAt, range.end),
          ),
        )
        .groupBy(bucket);
      const counts = new Map<string, number>();
      for (const row of rows) counts.set(row.bucket, row.total);
          return bucketKeys(range.start, range.end, gran).map((key) => ({
            label: bucketLabel(key, gran),
            fullLabel: bucketFullLabel(key, gran),
            visits: counts.get(key) ?? 0,
          }));
        },
      }),
    ),

  membershipsOverTime: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "memberships-over-time",
        loader: async (orgId, range) => {
      const gran = pickGranularity(range.days);
      const { interval, format } = bucketSqlParts(gran);
      const bucket = sql<string>`to_char(date_trunc(${interval}, ${studioMembership.startDate}), ${format})`;
      const rows = await db
        .select({
          bucket,
          total: count(),
        })
        .from(studioMembership)
        .where(
          and(
            ...membershipScope(orgId, ctx.locationId),
            gte(studioMembership.startDate, range.start),
            lt(studioMembership.startDate, range.end),
          ),
        )
        .groupBy(bucket);
      const counts = new Map<string, number>();
      for (const row of rows) counts.set(row.bucket, row.total);
          return bucketKeys(range.start, range.end, gran).map((key) => ({
            label: bucketLabel(key, gran),
            fullLabel: bucketFullLabel(key, gran),
            newMemberships: counts.get(key) ?? 0,
          }));
        },
      }),
    ),

  upcomingOccupancy: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx);
    const classes = await db.query.studioClass.findMany({
      where: and(
        ...classScope(orgId, ctx.locationId),
        gte(studioClass.startTime, new Date()),
        ne(studioClass.status, "CANCELLED")
      ),
      with: {
        studioBookings: { columns: { id: true } },
      },
      orderBy: asc(studioClass.startTime),
      limit: 10,
    });

    return classes.map((cls) => {
      const booked = cls.studioBookings.length;
      return {
        id: cls.id,
        name: cls.name,
        startTime: cls.startTime.toISOString(),
        booked,
        capacity: cls.maxCapacity,
        occupancyPct: cls.maxCapacity
          ? Math.round((booked / cls.maxCapacity) * 100)
          : null,
      };
    });
  }),

  membershipsByPlan: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx);
    const rows = await db.query.studioMembership.findMany({
      where: and(
        ...membershipScope(orgId, ctx.locationId),
        eq(studioMembership.status, "ACTIVE"),
      ),
      columns: { planId: true, type: true, name: true },
      with: {
        membershipPlan: { columns: { id: true, name: true, type: true } },
      },
    });
    const grouped = new Map<
      string,
      {
        planId: string;
        planName: string;
        planType: string;
        count: number;
      }
    >();
    for (const row of rows) {
      const planId = row.membershipPlan?.id ?? row.planId ?? "unknown";
      const current =
        grouped.get(planId) ??
        {
          planId,
          planName: row.membershipPlan?.name ?? row.name ?? "Imported membership",
          planType: row.membershipPlan?.type ?? row.type ?? "UNKNOWN",
          count: 0,
        };
      current.count++;
      grouped.set(planId, current);
    }
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  }),

  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx);
    const rows = await db.query.activity.findMany({
      where: and(
        eq(activity.organizationId, orgId),
        ctx.locationId ? eq(activity.locationId, ctx.locationId) : undefined
      ),
      orderBy: (table, { desc }) => desc(table.createdAt),
      limit: 8,
    });

    return rows.map((row) => ({
      type: row.entityType.toLowerCase(),
      label: activityLabel(row),
      time: row.createdAt.toISOString(),
    }));
  }),

  todaySchedule: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx);
    const { start, end } = todayRange();
    const classes = await db.query.studioClass.findMany({
      where: and(
        ...classScope(orgId, ctx.locationId),
        gte(studioClass.startTime, start),
        lte(studioClass.startTime, end)
      ),
      with: {
        classType: { columns: { name: true, color: true } },
        instructor: { columns: { name: true, profilePhoto: true } },
        studioBookings: { columns: { id: true } },
        checkIns: { columns: { id: true } },
      },
      orderBy: asc(studioClass.startTime),
    });

    return classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      status: cls.status,
      startTime: cls.startTime.toISOString(),
      endTime: cls.endTime.toISOString(),
      booked: cls.studioBookings.length,
      capacity: cls.maxCapacity,
      checkedIn: cls.checkIns.length,
      instructor: cls.instructor,
      classType: cls.classType,
    }));
  }),

  revenueOverTime: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "revenue-over-time",
        loader: async (orgId, range) => {
      const gran = pickGranularity(range.days);
      const { interval, format } = bucketSqlParts(gran);
      const bucket = sql<string>`to_char(date_trunc(${interval}, ${studioPayment.createdAt}), ${format})`;
      const rows = await db
        .select({
          bucket,
          total: sum(studioPayment.amount),
        })
        .from(studioPayment)
        .where(
          and(
            eq(studioPayment.organizationId, orgId),
            ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
            eq(studioPayment.status, "SUCCEEDED"),
            isNull(studioPayment.deletedAt),
            gte(studioPayment.createdAt, range.start),
            lt(studioPayment.createdAt, range.end),
          ),
        )
        .groupBy(bucket);
      const totals = new Map<string, number>();
      for (const row of rows) totals.set(row.bucket, amount(row.total));
          return bucketKeys(range.start, range.end, gran).map((key) => ({
            label: bucketLabel(key, gran),
            fullLabel: bucketFullLabel(key, gran),
            revenue: Math.round((totals.get(key) ?? 0) * 100) / 100,
          }));
        },
      }),
    ),

  revenueByCategory: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "revenue-by-category",
        loader: async (orgId, range) => {
      const rows = await db
        .select({
          category: sql<string>`${studioPayment.type}::text`,
          total: sum(studioPayment.amount),
        })
        .from(studioPayment)
        .where(
          and(
            eq(studioPayment.organizationId, orgId),
            ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
            eq(studioPayment.status, "SUCCEEDED"),
            isNull(studioPayment.deletedAt),
            gte(studioPayment.createdAt, range.start),
            lt(studioPayment.createdAt, range.end),
          ),
        )
        .groupBy(studioPayment.type);
          return rows
            .map((row) => ({
              category: row.category,
              revenue: amount(row.total),
            }))
            .map(({ category, revenue }) => ({
              category,
              label: category.replaceAll("_", " "),
              revenue: Math.round(revenue * 100) / 100,
            }))
            .sort((a, b) => b.revenue - a.revenue);
        },
      }),
    ),

  revenueByWeekday: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "revenue-by-weekday",
        loader: async (orgId, range) => {
      const weekdayExpr = sql<number>`extract(dow from ${studioPayment.createdAt})::int`;
      const rows = await db
        .select({
          weekday: weekdayExpr,
          total: sum(studioPayment.amount),
        })
        .from(studioPayment)
        .where(
          and(
            eq(studioPayment.organizationId, orgId),
            ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
            eq(studioPayment.status, "SUCCEEDED"),
            isNull(studioPayment.deletedAt),
            gte(studioPayment.createdAt, range.start),
            lt(studioPayment.createdAt, range.end),
          ),
        )
        .groupBy(weekdayExpr);
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const totals = new Map(labels.map((label) => [label, 0]));
      for (const row of rows) {
        const label = labels[row.weekday] ?? "Sun";
        totals.set(label, amount(row.total));
      }
          return labels.map((day) => ({
            day,
            revenue: Math.round((totals.get(day) ?? 0) * 100) / 100,
          }));
        },
      }),
    ),

  totalRevenue: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "total-revenue",
        loader: async (orgId, range) => {
      const previous = previousRange(range);
      const baseWhere = and(
        eq(studioPayment.organizationId, orgId),
        ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
        eq(studioPayment.status, "SUCCEEDED"),
        isNull(studioPayment.deletedAt),
      );
      const [currentAgg, previousAgg] = await Promise.all([
        db
          .select({ total: sum(studioPayment.amount) })
          .from(studioPayment)
          .where(and(baseWhere, gte(studioPayment.createdAt, range.start), lt(studioPayment.createdAt, range.end))),
        db
          .select({ total: sum(studioPayment.amount) })
          .from(studioPayment)
          .where(and(baseWhere, gte(studioPayment.createdAt, previous.start), lt(studioPayment.createdAt, previous.end))),
      ]);
      const total = amount(currentAgg[0]?.total);
      const previousTotal = amount(previousAgg[0]?.total);
          return {
            total: Math.round(total * 100) / 100,
            change: changePct(total, previousTotal),
          };
        },
      }),
    ),

  fitnessKpis: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "fitness-kpis",
        loader: async (orgId, range) => {
      const previous = previousRange(range);

      const [
        currentClasses,
        previousClasses,
        currentPayments,
        previousPayments,
        activeMemberships,
        clientAgg,
      ] = await Promise.all([
        db
          .select({
            id: studioClass.id,
            maxCapacity: studioClass.maxCapacity,
            endTime: studioClass.endTime,
            booked: sql<number>`count(${studioBooking.id}) filter (where ${studioBooking.status} <> 'CANCELLED')::int`,
            noShows: sql<number>`count(${studioBooking.id}) filter (where ${studioBooking.status} = 'NO_SHOW')::int`,
          })
          .from(studioClass)
          .leftJoin(studioBooking, eq(studioBooking.classId, studioClass.id))
          .where(bookingScope(orgId, ctx.locationId, range.start, range.end))
          .groupBy(studioClass.id, studioClass.maxCapacity, studioClass.endTime),
        db
          .select({
            id: studioClass.id,
            maxCapacity: studioClass.maxCapacity,
            endTime: studioClass.endTime,
            booked: sql<number>`count(${studioBooking.id}) filter (where ${studioBooking.status} <> 'CANCELLED')::int`,
            noShows: sql<number>`count(${studioBooking.id}) filter (where ${studioBooking.status} = 'NO_SHOW')::int`,
          })
          .from(studioClass)
          .leftJoin(studioBooking, eq(studioBooking.classId, studioClass.id))
          .where(bookingScope(orgId, ctx.locationId, previous.start, previous.end))
          .groupBy(studioClass.id, studioClass.maxCapacity, studioClass.endTime),
        db
          .select({ total: sum(studioPayment.amount) })
          .from(studioPayment)
          .where(
            and(
              eq(studioPayment.organizationId, orgId),
              ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
              eq(studioPayment.status, "SUCCEEDED"),
              isNull(studioPayment.deletedAt),
              gte(studioPayment.createdAt, range.start),
              lt(studioPayment.createdAt, range.end),
            ),
          ),
        db
          .select({ total: sum(studioPayment.amount) })
          .from(studioPayment)
          .where(
            and(
              eq(studioPayment.organizationId, orgId),
              ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
              eq(studioPayment.status, "SUCCEEDED"),
              isNull(studioPayment.deletedAt),
              gte(studioPayment.createdAt, previous.start),
              lt(studioPayment.createdAt, previous.end),
            ),
          ),
        db.select({ total: count() }).from(studioMembership).where(and(...membershipScope(orgId, ctx.locationId), eq(studioMembership.status, "ACTIVE"))),
        db
          .select({
            total: count(),
            churned: sql<number>`count(*) filter (where ${client.type} in ('CHURN', 'CLOSED'))::int`,
          })
          .from(client)
          .where(and(...clientScope(orgId, ctx.locationId))),
      ]);

      const nowDate = new Date();
      const utilizationFor = (classes: typeof currentClasses): number => {
        const booked = classes.reduce((sum, cls) => sum + cls.booked, 0);
        const capacity = classes.reduce(
          (sum, cls) => sum + (cls.maxCapacity ?? cls.booked),
          0,
        );
        return pct(booked, capacity);
      };
      const noShowFor = (classes: typeof currentClasses): number => {
        const endedClasses = classes.filter((cls) => cls.endTime <= nowDate);
        const noShows = endedClasses.reduce((sum, cls) => sum + cls.noShows, 0);
        const booked = endedClasses.reduce((sum, cls) => sum + cls.booked, 0);
        return pct(noShows, booked);
      };
      const currentRevenue = amount(currentPayments[0]?.total);
      const previousRevenue = amount(previousPayments[0]?.total);
      const membershipCount = activeMemberships[0]?.total ?? 0;
      const arpm = membershipCount > 0 ? Math.round((currentRevenue / membershipCount) * 100) / 100 : 0;
      const previousArpm = membershipCount > 0 ? Math.round((previousRevenue / membershipCount) * 100) / 100 : 0;
      const clientCount = clientAgg[0]?.total ?? 0;
      const churnedClients = clientAgg[0]?.churned ?? 0;

          return {
            arpm,
            arpmChange: changePct(arpm, previousArpm),
            noShowRate: noShowFor(currentClasses),
            noShowChange: changePct(
              noShowFor(currentClasses),
              noShowFor(previousClasses),
            ),
            classUtilization: utilizationFor(currentClasses),
            churnRate: pct(churnedClients, clientCount),
          };
        },
      }),
    ),

  statSparklines: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "stat-sparklines",
        loader: async (orgId, range) => {
      const gran = pickGranularity(range.days);
      const { interval, format } = bucketSqlParts(gran);
      const membershipBucket = sql<string>`to_char(date_trunc(${interval}, ${studioMembership.startDate}), ${format})`;
      const visitBucket = sql<string>`to_char(date_trunc(${interval}, ${checkIn.checkedInAt}), ${format})`;
      const revenueBucket = sql<string>`to_char(date_trunc(${interval}, ${studioPayment.createdAt}), ${format})`;
      const [memberships, visits, revenue] = await Promise.all([
        db
          .select({
            bucket: membershipBucket,
            total: count(),
          })
          .from(studioMembership)
          .where(
            and(
              ...membershipScope(orgId, ctx.locationId),
              gte(studioMembership.startDate, range.start),
              lt(studioMembership.startDate, range.end),
            ),
          )
          .groupBy(membershipBucket),
        db
          .select({
            bucket: visitBucket,
            total: count(),
          })
          .from(checkIn)
          .where(
            and(
              eq(checkIn.organizationId, orgId),
              ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
              gte(checkIn.checkedInAt, range.start),
              lt(checkIn.checkedInAt, range.end),
            ),
          )
          .groupBy(visitBucket),
        db
          .select({
            bucket: revenueBucket,
            total: sum(studioPayment.amount),
          })
          .from(studioPayment)
          .where(
            and(
              eq(studioPayment.organizationId, orgId),
              ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
              eq(studioPayment.status, "SUCCEEDED"),
              isNull(studioPayment.deletedAt),
              gte(studioPayment.createdAt, range.start),
              lt(studioPayment.createdAt, range.end),
            ),
          )
          .groupBy(revenueBucket),
      ]);

      const membershipMap = new Map<string, number>();
      const visitMap = new Map<string, number>();
      const revenueMap = new Map<string, number>();
      for (const row of memberships) membershipMap.set(row.bucket, row.total);
      for (const row of visits) visitMap.set(row.bucket, row.total);
      for (const row of revenue) revenueMap.set(row.bucket, amount(row.total));
      const keys = bucketKeys(range.start, range.end, gran);

          return {
            memberships: keys.map((key) => ({ v: membershipMap.get(key) ?? 0 })),
            visits: keys.map((key) => ({ v: visitMap.get(key) ?? 0 })),
            revenue: keys.map((key) => ({
              v: Math.round((revenueMap.get(key) ?? 0) * 100) / 100,
            })),
          };
        },
      }),
    ),

  atRiskMembers: protectedProcedure.query(({ ctx }) =>
    cacheDashboardMetric({
      ctx,
      metric: "at-risk-members",
      loader: async (orgId) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const expiringEnd = new Date();
    expiringEnd.setDate(expiringEnd.getDate() + 30);

    const [clients, expiringMemberships] = await Promise.all([
      db.query.client.findMany({
        where: and(...clientScope(orgId, ctx.locationId), ne(client.type, "CLOSED")),
        columns: {
          id: true,
          name: true,
          email: true,
          attendanceCount: true,
          currentStreak: true,
        },
        with: {
          checkIns: {
            columns: { checkedInAt: true },
            orderBy: desc(checkIn.checkedInAt),
            limit: 1,
          },
        },
        limit: 100,
      }),
      db.query.studioMembership.findMany({
        where: and(
          ...membershipScope(orgId, ctx.locationId),
          eq(studioMembership.status, "ACTIVE"),
          gte(studioMembership.endDate, new Date()),
          lte(studioMembership.endDate, expiringEnd),
        ),
        columns: { id: true, clientId: true, name: true, endDate: true },
        with: { client: { columns: { name: true, email: true } } },
        orderBy: asc(studioMembership.endDate),
        limit: 8,
      }),
    ]);

        return {
      lapsed: clients
        .map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          lastCheckIn: row.checkIns[0]?.checkedInAt.toISOString() ?? null,
          streak: row.currentStreak,
          totalVisits: row.attendanceCount,
        }))
        .filter((row) => !row.lastCheckIn || new Date(row.lastCheckIn) < cutoff)
        .slice(0, 8),
      expiring: expiringMemberships.map((row) => ({
        id: row.id,
        clientId: row.clientId,
        clientName: row.client?.name ?? "Unknown member",
        clientEmail: row.client?.email ?? null,
        planName: row.name,
        endDate: row.endDate?.toISOString() ?? null,
      })),
    } satisfies {
        lapsed: {
          id: string;
          name: string;
          email: string | null;
          lastCheckIn: string | null;
          streak: number;
          totalVisits: number;
        }[];
        expiring: {
          id: string;
          clientId: string;
          clientName: string;
          clientEmail: string | null;
          planName: string;
          endDate: string | null;
        }[];
          };
      },
    }),
  ),

  waitlistSummary: protectedProcedure.query(({ ctx }) =>
    cacheDashboardMetric({
      ctx,
      metric: "waitlist-summary",
      ttlSeconds: 60,
      loader: async (orgId) => {
    const nowDate = new Date();
    const classes = await db.query.studioClass.findMany({
      where: and(
        ...classScope(orgId, ctx.locationId),
        gte(studioClass.startTime, nowDate),
        ne(studioClass.status, "CANCELLED"),
      ),
      columns: { id: true, name: true, startTime: true, maxCapacity: true },
      with: {
        classWaitlists: {
          where: eq(classWaitlist.status, "WAITING"),
          columns: { id: true },
        },
        studioBookings: { columns: { id: true, status: true } },
        classType: { columns: { name: true, color: true } },
        instructor: { columns: { name: true } },
      },
      orderBy: asc(studioClass.startTime),
      limit: 20,
    });
    const rows = classes
      .map((row) => ({
        id: row.id,
        name: row.name,
        startTime: row.startTime.toISOString(),
        waitlistCount: row.classWaitlists.length,
        bookedCount: row.studioBookings.filter((booking) => booking.status !== "CANCELLED").length,
        capacity: row.maxCapacity,
        classType: row.classType,
        instructor: row.instructor,
      }))
      .filter((row) => row.waitlistCount > 0);

        return {
      totalWaiting: rows.reduce((sum, row) => sum + row.waitlistCount, 0),
      classes: rows,
    } satisfies {
        totalWaiting: number;
        classes: {
          id: string;
          name: string;
          startTime: string;
          waitlistCount: number;
          bookedCount: number;
          capacity: number | null;
          classType: { name: string; color: string | null } | null;
          instructor: { name: string } | null;
        }[];
          };
      },
    }),
  ),

  newMembersCount: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "new-members-count",
        loader: async (orgId, range) => {
    const previous = previousRange(range);
    const [currentRows, previousRows] = await Promise.all([
      db
        .select({ total: count() })
        .from(client)
        .where(and(...clientScope(orgId, ctx.locationId), gte(client.createdAt, range.start), lt(client.createdAt, range.end))),
      db
        .select({ total: count() })
        .from(client)
        .where(and(...clientScope(orgId, ctx.locationId), gte(client.createdAt, previous.start), lt(client.createdAt, previous.end))),
    ]);
          const current = currentRows[0]?.total ?? 0;
          return {
            count: current,
            change: changePct(current, previousRows[0]?.total ?? 0),
            label: range.label,
          };
        },
      }),
    ),

  expiringMembershipsCount: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "expiring-memberships-count",
        loader: async (orgId, range) => {
      const nowDate = new Date();
      const rows = await db
        .select({ total: count() })
        .from(studioMembership)
        .where(
          and(
            ...membershipScope(orgId, ctx.locationId),
            eq(studioMembership.status, "ACTIVE"),
            gte(studioMembership.endDate, nowDate),
            lte(studioMembership.endDate, range.end),
          ),
        );
          return { count: rows[0]?.total ?? 0 };
        },
      }),
    ),

  conversionOverview: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "conversion-overview",
        loader: async (orgId, range) => {
      const previous = previousRange(range);
      const automationTypes = [
        "LEAD_CONVERTED",
        "MEMBERSHIP_SIGNUP",
        "INTRO_OFFER_COMPLETED",
      ] as const;
      const [clients, memberships, referrals, automations, previousAutomations] = await Promise.all([
        db
          .select({
            total: count(),
            firstVisits: sql<number>`count(*) filter (where ${client.trialStartedAt} is not null)::int`,
          })
          .from(client)
          .where(
            and(
              ...clientScope(orgId, ctx.locationId),
              gte(client.createdAt, range.start),
              lt(client.createdAt, range.end),
            ),
          ),
        db
          .select({
            total: count(),
            members: sql<number>`count(distinct ${studioMembership.clientId})::int`,
            intro: sql<number>`count(*) filter (where ${membershipPlan.type} = 'INTRO_OFFER' or ${membershipPlan.isIntroOffer} is true)::int`,
          })
          .from(studioMembership)
          .leftJoin(membershipPlan, eq(studioMembership.planId, membershipPlan.id))
          .where(
            and(
              ...membershipScope(orgId, ctx.locationId),
              gte(studioMembership.startDate, range.start),
              lt(studioMembership.startDate, range.end),
            ),
          ),
        db
          .select({ total: count() })
          .from(referral)
          .where(
            and(
              or(eq(referral.status, "CONVERTED"), eq(referral.status, "SIGNED_UP"))!,
              gte(referral.createdAt, range.start),
              lt(referral.createdAt, range.end),
            ),
          ),
        db
          .select({ total: count() })
          .from(automationEvent)
          .where(
            and(
              eq(automationEvent.organizationId, orgId),
              ctx.locationId ? eq(automationEvent.locationId, ctx.locationId) : undefined,
              inArray(automationEvent.type, automationTypes),
              gte(automationEvent.occurredAt, range.start),
              lt(automationEvent.occurredAt, range.end),
            ),
          ),
        db
          .select({ total: count() })
          .from(automationEvent)
          .where(
            and(
              eq(automationEvent.organizationId, orgId),
              ctx.locationId ? eq(automationEvent.locationId, ctx.locationId) : undefined,
              inArray(automationEvent.type, automationTypes),
              gte(automationEvent.occurredAt, previous.start),
              lt(automationEvent.occurredAt, previous.end),
            ),
          ),
      ]);
      const clientCount = clients[0]?.total ?? 0;
      const firstVisitCount = clients[0]?.firstVisits ?? 0;
      const membershipCount = memberships[0]?.total ?? 0;
      const memberClientCount = memberships[0]?.members ?? 0;
      const introMembershipCount = memberships[0]?.intro ?? 0;
      const automationCount = automations[0]?.total ?? 0;
      const previousAutomationCount = previousAutomations[0]?.total ?? 0;

          return {
        sankey: {
          nodes: [
            { name: "Inquiries" },
            { name: "First visits" },
            { name: "Memberships" },
          ],
          links: [
            { source: 0, target: 1, value: firstVisitCount },
            { source: 1, target: 2, value: memberClientCount },
          ],
        },
        metrics: {
          inquiryToMembershipRate: pct(memberClientCount, clientCount),
          firstVisitRate: pct(firstVisitCount, clientCount),
          introToMembershipRate: pct(introMembershipCount, membershipCount),
          referralConversionRate: pct(referrals[0]?.total ?? 0, clientCount),
          automationConversions: automationCount,
          automationConversionsChange: changePct(
            automationCount,
            previousAutomationCount,
          ),
        },
          };
        },
      }),
    ),

  planGainLoss: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "plan-gain-loss",
        loader: async (orgId, range) => {
      const previous = previousRange(range);
      const [gained, lost, previousGained, previousLost] = await Promise.all([
        db.select({ total: count() }).from(studioMembership).where(and(...membershipScope(orgId, ctx.locationId), gte(studioMembership.startDate, range.start), lt(studioMembership.startDate, range.end))),
        db.select({ total: count() }).from(studioMembership).where(and(...membershipScope(orgId, ctx.locationId), or(eq(studioMembership.status, "CANCELLED"), eq(studioMembership.status, "EXPIRED"))!, gte(studioMembership.endDate, range.start), lt(studioMembership.endDate, range.end))),
        db.select({ total: count() }).from(studioMembership).where(and(...membershipScope(orgId, ctx.locationId), gte(studioMembership.startDate, previous.start), lt(studioMembership.startDate, previous.end))),
        db.select({ total: count() }).from(studioMembership).where(and(...membershipScope(orgId, ctx.locationId), or(eq(studioMembership.status, "CANCELLED"), eq(studioMembership.status, "EXPIRED"))!, gte(studioMembership.endDate, previous.start), lt(studioMembership.endDate, previous.end))),
      ]);
      const currentGained = gained[0]?.total ?? 0;
      const currentLost = lost[0]?.total ?? 0;
      const currentNet = currentGained - currentLost;
      const previousNet = (previousGained[0]?.total ?? 0) - (previousLost[0]?.total ?? 0);
          return {
            gained: currentGained,
            lost: currentLost,
            net: currentNet,
            change: changePct(currentNet, previousNet),
          };
        },
      }),
    ),

  classTypeUtilization: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "class-type-utilization",
        loader: async (orgId, range) => {
      const classes = await db
        .select({
          classTypeId: studioClass.classTypeId,
          maxCapacity: studioClass.maxCapacity,
          booked: sql<number>`count(${studioBooking.id}) filter (where ${studioBooking.status} <> 'CANCELLED')::int`,
          typeId: classType.id,
          typeName: classType.name,
          typeColor: classType.color,
        })
        .from(studioClass)
        .leftJoin(classType, eq(studioClass.classTypeId, classType.id))
        .leftJoin(studioBooking, eq(studioBooking.classId, studioClass.id))
        .where(bookingScope(orgId, ctx.locationId, range.start, range.end))
        .groupBy(
          studioClass.id,
          studioClass.classTypeId,
          studioClass.maxCapacity,
          classType.id,
          classType.name,
          classType.color,
        );
      const grouped = new Map<string, { id: string; name: string; color: string | null; classes: number; booked: number; capacity: number }>();
      for (const cls of classes) {
        const id = cls.typeId ?? cls.classTypeId ?? "unknown";
        const current = grouped.get(id) ?? {
          id,
          name: cls.typeName ?? "Uncategorised",
          color: cls.typeColor ?? null,
          classes: 0,
          booked: 0,
          capacity: 0,
        };
        current.classes++;
        current.booked += cls.booked;
        current.capacity += cls.maxCapacity ?? cls.booked;
        grouped.set(id, current);
      }
          return Array.from(grouped.values()).map((row) => ({
            ...row,
            utilization: pct(row.booked, row.capacity),
          }));
        },
      }),
    ),

  instructorUtilization: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "instructor-utilization",
        loader: async (orgId, range) => {
      const classes = await db
        .select({
          instructorId: studioClass.instructorId,
          instructorName: studioClass.instructorName,
          maxCapacity: studioClass.maxCapacity,
          booked: sql<number>`count(${studioBooking.id}) filter (where ${studioBooking.status} <> 'CANCELLED')::int`,
          profileId: instructor.id,
          profileName: instructor.name,
          profilePhoto: instructor.profilePhoto,
        })
        .from(studioClass)
        .leftJoin(instructor, eq(studioClass.instructorId, instructor.id))
        .leftJoin(studioBooking, eq(studioBooking.classId, studioClass.id))
        .where(bookingScope(orgId, ctx.locationId, range.start, range.end))
        .groupBy(
          studioClass.id,
          studioClass.instructorId,
          studioClass.instructorName,
          studioClass.maxCapacity,
          instructor.id,
          instructor.name,
          instructor.profilePhoto,
        );
      const grouped = new Map<string, { id: string; name: string; profilePhoto: string | null; classes: number; booked: number; capacity: number }>();
      for (const cls of classes) {
        const id = cls.profileId ?? cls.instructorId ?? "unassigned";
        const current = grouped.get(id) ?? {
          id,
          name: cls.profileName ?? cls.instructorName ?? "Unassigned",
          profilePhoto: cls.profilePhoto ?? null,
          classes: 0,
          booked: 0,
          capacity: 0,
        };
        current.classes++;
        current.booked += cls.booked;
        current.capacity += cls.maxCapacity ?? cls.booked;
        grouped.set(id, current);
      }
          return Array.from(grouped.values()).map((row) => ({
            ...row,
            utilization: pct(row.booked, row.capacity),
          }));
        },
      }),
    ),

  automationAttribution: protectedProcedure
    .input(rangeInputSchema)
    .query(({ ctx, input }) =>
      cacheDashboardRangeMetric({
        ctx,
        input,
        metric: "automation-attribution",
        loader: async (orgId, range) => {
      const workflowIdExpr = sql<string>`coalesce(${automationEvent.workflowId}, 'unattributed')`;
      const workflowNameExpr = sql<string>`case when ${workflowIdExpr} = 'unattributed' then 'Unattributed automation' else min(${automationEvent.name}) end`;
      const rows = await db
        .select({
          workflowId: workflowIdExpr,
          workflowName: workflowNameExpr,
          conversions: count(),
          value: sum(automationEvent.value),
        })
        .from(automationEvent)
        .where(
          and(
            eq(automationEvent.organizationId, orgId),
            ctx.locationId ? eq(automationEvent.locationId, ctx.locationId) : undefined,
            inArray(automationEvent.type, ["LEAD_CONVERTED", "MEMBERSHIP_SIGNUP", "INTRO_OFFER_COMPLETED", "PAYMENT_SUCCEEDED"]),
            gte(automationEvent.occurredAt, range.start),
            lt(automationEvent.occurredAt, range.end),
          ),
        )
        .groupBy(workflowIdExpr);

          return rows
            .map((row) => ({
              workflowId: row.workflowId,
              workflowName: row.workflowName,
              conversions: row.conversions,
              value: amount(row.value),
            }))
            .sort((a, b) => b.conversions - a.conversions);
        },
      }),
    ),

  campaignPerformance: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrg(ctx);
      return readThroughRedisCache({
        key: dashboardCacheKey({
          metric: "campaign-performance",
          orgId,
          locationId: ctx.locationId,
          parts: [String(input.days)],
        }),
        ttlSeconds: DASHBOARD_RANGE_CACHE_SECONDS,
        loader: async () => {
          const start = new Date();
          start.setDate(start.getDate() - input.days);

          const rows = await db.query.campaign.findMany({
            where: and(
              eq(campaign.organizationId, orgId),
              ctx.locationId ? eq(campaign.locationId, ctx.locationId) : undefined,
              gte(campaign.createdAt, start)
            ),
            orderBy: desc(campaign.createdAt),
            limit: 8,
          });

          return rows.map((row) => ({
            id: row.id,
            name: row.name,
            status: row.status,
            totalRecipients: row.totalRecipients,
            delivered: row.delivered,
            opened: row.opened,
            clicked: row.clicked,
            openRate: row.delivered
              ? Math.round((row.opened / row.delivered) * 100)
              : 0,
            clickRate: row.delivered
              ? Math.round((row.clicked / row.delivered) * 100)
              : 0,
          }));
        },
      });
    }),

  dataRange: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrg(ctx);
    const [payments, checkIns, memberships, classes] = await Promise.all([
      db
        .select({ earliest: min(studioPayment.createdAt) })
        .from(studioPayment)
        .where(
          and(
            eq(studioPayment.organizationId, orgId),
            ctx.locationId ? eq(studioPayment.locationId, ctx.locationId) : undefined,
          ),
        ),
      db
        .select({ earliest: min(checkIn.createdAt) })
        .from(checkIn)
        .where(
          and(
            eq(checkIn.organizationId, orgId),
            ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined,
          ),
        ),
      db
        .select({ earliest: min(studioMembership.createdAt) })
        .from(studioMembership)
        .where(and(...membershipScope(orgId, ctx.locationId))),
      db
        .select({ earliest: min(studioClass.startTime) })
        .from(studioClass)
        .where(
          and(
            eq(studioClass.organizationId, orgId),
            ctx.locationId ? eq(studioClass.locationId, ctx.locationId) : undefined,
          ),
        ),
    ]);

    const dates = [
      payments[0]?.earliest,
      checkIns[0]?.earliest,
      memberships[0]?.earliest,
      classes[0]?.earliest,
    ].filter((d): d is Date => d instanceof Date);

    const earliest = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    return { earliest };
  }),

  activeDates: protectedProcedure.query(({ ctx }) =>
    cacheDashboardMetric({
      ctx,
      metric: "active-dates",
      ttlSeconds: DASHBOARD_METADATA_CACHE_SECONDS,
      loader: async (orgId) => {
    const locFilter = ctx.locationId;

        const rows = await db.execute<{ d: string }>(sql`
      SELECT DISTINCT d FROM (
        SELECT date_trunc('day', ${studioClass.startTime})::date::text AS d
          FROM ${studioClass}
         WHERE ${studioClass.organizationId} = ${orgId}
           ${locFilter ? sql`AND ${studioClass.locationId} = ${locFilter}` : sql``}
        UNION
        SELECT date_trunc('day', ${checkIn.createdAt})::date::text AS d
          FROM ${checkIn}
         WHERE ${checkIn.organizationId} = ${orgId}
           ${locFilter ? sql`AND ${checkIn.locationId} = ${locFilter}` : sql``}
        UNION
        SELECT date_trunc('day', ${studioPayment.createdAt})::date::text AS d
          FROM ${studioPayment}
         WHERE ${studioPayment.organizationId} = ${orgId}
           ${locFilter ? sql`AND ${studioPayment.locationId} = ${locFilter}` : sql``}
      ) sub
      ORDER BY d
    `);

        return rows.rows.map((r) => r.d);
      },
    }),
  ),
});
