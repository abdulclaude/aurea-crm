import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  checkIn,
  classSeries,
  classType,
  cancellationPolicy,
  classWaitlist,
  instructor,
  organization,
  room,
  serviceType,
  studioBooking,
  studioClass,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { materializeSchedulingPoliciesForOccurrences } from "@/features/studio/server/scheduling-policy-materializer";
import {
  supportsWaitlistRuntime,
  type WaitlistValues,
} from "@/features/studio/scheduling/contracts";
import { requireCapability } from "@/features/permissions/server/authorization";
import { requireSchedulingPolicyAccess } from "@/features/studio/server/scheduling-policy-access";

const classStatusSchema = z.enum([
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "IN_PROGRESS",
]);

const difficultySchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "ALL_LEVELS",
]);

const pricingModelSchema = z.enum([
  "FREE",
  "DROP_IN",
  "PACKAGE_ONLY",
  "SLIDING_SCALE",
]);

const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Use a valid amount with up to 2 decimals");

const classOptionsSchema = {
  pricingModel: pricingModelSchema.optional(),
  dropInPrice: moneySchema.optional(),
  slidingScaleMinPrice: moneySchema.optional(),
  slidingScaleMaxPrice: moneySchema.optional(),
  currency: z.string().length(3).default("GBP").optional(),
  waitlistEnabled: z.boolean().optional(),
  autoPromoteWaitlist: z.boolean().optional(),
  onlineBookingEnabled: z.boolean().optional(),
  onlineCapacity: z.number().int().min(0).optional(),
  walkInCapacity: z.number().int().min(0).optional(),
  spotPickingEnabled: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  cancellationPolicyId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().max(200).optional(),
} satisfies z.ZodRawShape;

type StudioClassWithRelations = NonNullable<
  Awaited<ReturnType<typeof getClassWithRelations>>
>;

function baseConditions(orgId: string, locationId: string | null) {
  return [
    eq(studioClass.organizationId, orgId),
    locationId ? eq(studioClass.locationId, locationId) : undefined,
  ];
}

function classRelations() {
  return {
    classType: { columns: { id: true, name: true, color: true } },
    serviceType: { columns: { id: true, name: true, calendarColor: true } },
    instructor: {
      columns: { id: true, name: true, email: true, profilePhoto: true },
    },
    room: { columns: { id: true, name: true, capacity: true } },
    studioBookings: {
      columns: {
        id: true,
        classId: true,
        status: true,
        notes: true,
        bookedAt: true,
        checkedInAt: true,
        cancelledAt: true,
        clientId: true,
      },
      with: {
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            tags: true,
          },
          with: {
            studioMemberships: {
              columns: { id: true, name: true, status: true },
              with: { membershipPlan: { columns: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: desc(studioBooking.bookedAt),
    },
    classWaitlists: {
      columns: {
        id: true,
        status: true,
        position: true,
        clientId: true,
      },
      with: {
        client: { columns: { id: true, name: true, email: true } },
      },
      orderBy: asc(classWaitlist.position),
    },
    checkIns: {
      columns: {
        id: true,
        checkedInAt: true,
        isLateArrival: true,
        clientId: true,
      },
      with: {
        client: { columns: { id: true, name: true } },
      },
      orderBy: desc(checkIn.checkedInAt),
    },
  } as const;
}

async function getClassWithRelations(id: string) {
  return db.query.studioClass.findFirst({
    where: eq(studioClass.id, id),
    with: classRelations(),
  });
}

function mapClass(cls: StudioClassWithRelations) {
  const _count = {
    studioBooking: cls.studioBookings.length,
    classWaitlist: cls.classWaitlists.length,
    checkIn: cls.checkIns.length,
  };

  return {
    ...cls,
    _count,
    studioBooking: cls.studioBookings,
    classWaitlist: cls.classWaitlists,
    checkIn: cls.checkIns,
  };
}

function groupByDay(classes: ReturnType<typeof mapClass>[]) {
  const schedule: Record<string, ReturnType<typeof mapClass>[]> = {};

  for (const cls of classes) {
    const dateKey = cls.startTime.toISOString().split("T")[0];
    if (!schedule[dateKey]) {
      schedule[dateKey] = [];
    }
    schedule[dateKey].push(cls);
  }

  return schedule;
}

function moneyToPence(amount: string): number {
  const [pounds, pennies = ""] = amount.split(".");
  return Number(pounds) * 100 + Number(pennies.padEnd(2, "0"));
}

function datePart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function timePart(value: Date): string {
  return value.toTimeString().slice(0, 5);
}

function recurrenceDays(startTime: Date, recurrenceRule?: string | null) {
  if (!recurrenceRule) return [];
  const day = startTime
    .toLocaleDateString("en-GB", { weekday: "long" })
    .toUpperCase();
  return [day];
}

function validateClassOptions(input: {
  pricingModel?: z.infer<typeof pricingModelSchema>;
  dropInPrice?: string;
  slidingScaleMinPrice?: string;
  slidingScaleMaxPrice?: string;
  maxCapacity?: number | null;
  onlineCapacity?: number | null;
  walkInCapacity?: number | null;
  waitlistEnabled?: boolean | null;
  autoPromoteWaitlist?: boolean | null;
  isRecurring?: boolean | null;
  recurrenceRule?: string | null;
}) {
  if (input.pricingModel === "DROP_IN" && !input.dropInPrice) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Drop-in price is required for drop-in pricing",
    });
  }

  if (input.pricingModel === "SLIDING_SCALE") {
    if (!input.slidingScaleMinPrice || !input.slidingScaleMaxPrice) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Sliding scale minimum and maximum prices are required",
      });
    }

    if (
      moneyToPence(input.slidingScaleMinPrice) >
      moneyToPence(input.slidingScaleMaxPrice)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Sliding scale maximum must be greater than the minimum",
      });
    }
  }

  const splitCapacity =
    (input.onlineCapacity ?? 0) + (input.walkInCapacity ?? 0);
  if (input.maxCapacity && splitCapacity > input.maxCapacity) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Online and walk-in capacity cannot exceed total capacity",
    });
  }

  if (input.autoPromoteWaitlist && !input.waitlistEnabled) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Auto-promote requires waitlist to be enabled",
    });
  }

  if (input.isRecurring && !input.recurrenceRule) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Recurring classes require a repeat rule",
    });
  }
}

function buildClassOccurrences(
  startTime: Date,
  endTime: Date,
  recurrenceRule?: string | null,
): Array<{ startTime: Date; endTime: Date }> {
  if (!recurrenceRule) return [{ startTime, endTime }];

  const parts = Object.fromEntries(
    recurrenceRule.split(";").map((part) => {
      const [key, value = ""] = part.split("=");
      return [key, value];
    }),
  );
  const frequency = parts.FREQ;
  const interval = Number(parts.INTERVAL ?? "1");
  const countValue = Number(parts.COUNT ?? "1");
  const count = Number.isInteger(countValue)
    ? Math.min(Math.max(countValue, 1), 52)
    : 1;

  if (!Number.isInteger(interval) || interval < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Repeat interval must be a positive whole number",
    });
  }

  if (frequency !== "WEEKLY" && frequency !== "MONTHLY") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unsupported repeat frequency",
    });
  }

  return Array.from({ length: count }, (_, index) => {
    const nextStart = new Date(startTime);
    const nextEnd = new Date(endTime);
    if (frequency === "MONTHLY") {
      nextStart.setMonth(nextStart.getMonth() + index * interval);
      nextEnd.setMonth(nextEnd.getMonth() + index * interval);
    } else {
      nextStart.setDate(nextStart.getDate() + index * interval * 7);
      nextEnd.setDate(nextEnd.getDate() + index * interval * 7);
    }
    return { startTime: nextStart, endTime: nextEnd };
  });
}

export const studioClassesEnhancedRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        instructorId: z.string().optional(),
        classTypeId: z.string().optional(),
        roomId: z.string().optional(),
        status: classStatusSchema.optional(),
        sortDirection: z.enum(["ASC", "DESC"]).default("ASC"),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const conditions: (SQL | undefined)[] = baseConditions(
        ctx.orgId,
        ctx.locationId,
      );

      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          or(
            ilike(studioClass.name, pattern),
            ilike(studioClass.description, pattern),
          ),
        );
      }

      if (input.startDate) {
        conditions.push(gte(studioClass.startTime, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(studioClass.startTime, new Date(input.endDate)));
      }

      if (input.instructorId) {
        conditions.push(eq(studioClass.instructorId, input.instructorId));
      }

      if (input.classTypeId) {
        conditions.push(eq(studioClass.classTypeId, input.classTypeId));
      }

      if (input.roomId) {
        conditions.push(eq(studioClass.roomId, input.roomId));
      }

      if (input.status) {
        conditions.push(eq(studioClass.status, input.status));
      }

      const where = and(...conditions);
      const [totalResult, classes] = await Promise.all([
        db.select({ total: count() }).from(studioClass).where(where),
        db.query.studioClass.findMany({
          where,
          with: classRelations(),
          orderBy:
            input.sortDirection === "DESC"
              ? desc(studioClass.startTime)
              : asc(studioClass.startTime),
          offset: (input.page - 1) * input.pageSize,
          limit: input.pageSize,
        }),
      ]);
      const totalItems = totalResult[0]?.total ?? 0;

      return {
        classes: classes.map(mapClass),
        pagination: {
          currentPage: input.page,
          totalPages: Math.ceil(totalItems / input.pageSize),
          pageSize: input.pageSize,
          totalItems,
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const cls = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          ...baseConditions(ctx.orgId, ctx.locationId),
        ),
        with: classRelations(),
      });

      if (!cls) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }
      const [org] = await db
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, ctx.orgId))
        .limit(1);

      return { ...mapClass(cls), organizationSlug: org?.slug ?? null };
    }),

  getSchedule: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const classes = await db.query.studioClass.findMany({
        where: and(
          ...baseConditions(ctx.orgId, ctx.locationId),
          gte(studioClass.startTime, new Date(input.startDate)),
          lte(studioClass.startTime, new Date(input.endDate)),
          ne(studioClass.status, "CANCELLED"),
        ),
        with: classRelations(),
        orderBy: asc(studioClass.startTime),
      });

      return groupByDay(classes.map(mapClass));
    }),

  upcoming: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).default(10) }).optional(),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const classes = await db.query.studioClass.findMany({
        where: and(
          ...baseConditions(ctx.orgId, ctx.locationId),
          gte(studioClass.startTime, now),
          lte(studioClass.startTime, nextWeek),
          ne(studioClass.status, "CANCELLED"),
        ),
        with: classRelations(),
        orderBy: asc(studioClass.startTime),
        limit: input?.limit ?? 10,
      });

      return classes.map(mapClass);
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const scope = baseConditions(ctx.orgId, ctx.locationId);

    const [totalClasses, upcomingClasses, todayClasses, totalCheckIns] =
      await Promise.all([
        db
          .select({ total: count() })
          .from(studioClass)
          .where(and(...scope)),
        db
          .select({ total: count() })
          .from(studioClass)
          .where(
            and(
              ...scope,
              gte(studioClass.startTime, now),
              lte(studioClass.startTime, nextWeek),
              eq(studioClass.status, "SCHEDULED"),
            ),
          ),
        db
          .select({ total: count() })
          .from(studioClass)
          .where(
            and(
              ...scope,
              gte(studioClass.startTime, today),
              lt(studioClass.startTime, tomorrow),
            ),
          ),
        db
          .select({ total: count() })
          .from(checkIn)
          .where(
            and(
              eq(checkIn.organizationId, ctx.orgId),
              ctx.locationId
                ? eq(checkIn.locationId, ctx.locationId)
                : undefined,
            ),
          ),
      ]);

    return {
      totalClasses: totalClasses[0]?.total ?? 0,
      upcomingClasses: upcomingClasses[0]?.total ?? 0,
      todayClasses: todayClasses[0]?.total ?? 0,
      totalCheckIns: totalCheckIns[0]?.total ?? 0,
    };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        startTime: z.string().transform((value) => new Date(value)),
        endTime: z.string().transform((value) => new Date(value)),
        maxCapacity: z.number().int().min(1).optional(),
        minCapacity: z.number().int().min(0).optional(),
        serviceTypeId: z.string().optional(),
        classTypeId: z.string().optional(),
        instructorId: z.string().optional(),
        roomId: z.string().optional(),
        difficulty: difficultySchema.optional(),
        equipmentNeeded: z.array(z.string()).optional(),
        bookingWindowHours: z.number().int().min(1).optional(),
        cancellationWindowHours: z.number().int().min(0).optional(),
        bookingWindowPolicyOverrideId: z.string().min(1).optional(),
        waitlistPolicyOverrideId: z.string().min(1).optional(),
        isVirtual: z.boolean().optional(),
        color: z.string().max(20).optional(),
        ...classOptionsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "schedule.manage");
      const organizationId = scope.organizationId;

      await assertClassReferences(organizationId, scope.locationId, {
        instructorId: input.instructorId,
        roomId: input.roomId,
        serviceTypeId: input.serviceTypeId,
        classTypeId: input.classTypeId,
        cancellationPolicyId: input.cancellationPolicyId,
      });
      validateClassOptions(input);

      if (input.endTime <= input.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      const occurrences = buildClassOccurrences(
        input.startTime,
        input.endTime,
        input.isRecurring ? input.recurrenceRule : undefined,
      );
      const firstId = crypto.randomUUID();
      const seriesId = input.isRecurring ? createId() : null;

      await db.transaction(async (tx) => {
        const resolvedPolicies =
          await materializeSchedulingPoliciesForOccurrences({
            tx,
            organizationId,
            locationId: scope.locationId,
            serviceTypeId: input.serviceTypeId,
            bookingWindowPolicyOverrideId: input.bookingWindowPolicyOverrideId,
            waitlistPolicyOverrideId: input.waitlistPolicyOverrideId,
            startsAt: occurrences.map((occurrence) => occurrence.startTime),
            legacy: {
              bookingWindowHours: input.bookingWindowHours,
              cancellationWindowHours: input.cancellationWindowHours,
              waitlistEnabled: input.waitlistEnabled,
              autoPromoteWaitlist: input.autoPromoteWaitlist,
            },
          });
        const resolvedAt = new Date();
        const rows = occurrences.map((occurrence, index) => {
          const policies = resolvedPolicies[index];
          if (!policies) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Scheduling policies could not be resolved.",
            });
          }
          const bookingValues = policies.bookingWindow.values;
          const waitlistValues = policies.waitlist.values;
          assertSupportedWaitlistRuntime(waitlistValues);
          return {
            id: index === 0 ? firstId : crypto.randomUUID(),
            name: input.name,
            description: input.description,
            startTime: occurrence.startTime,
            endTime: occurrence.endTime,
            maxCapacity: input.maxCapacity,
            minCapacity: input.minCapacity,
            serviceTypeId: input.serviceTypeId,
            classTypeId: input.classTypeId,
            instructorId: input.instructorId,
            roomId: input.roomId,
            difficulty: input.difficulty,
            equipmentNeeded: input.equipmentNeeded ?? [],
            bookingWindowHours: Math.ceil(
              bookingValues.opensMinutesBeforeStart / 60,
            ),
            cancellationWindowHours: Math.ceil(
              bookingValues.cancellationsCloseMinutesBeforeStart / 60,
            ),
            bookingWindowPolicyOverrideId: input.bookingWindowPolicyOverrideId,
            resolvedBookingWindowPolicyId: policies.bookingWindow.policyId,
            resolvedBookingWindowPolicyVersionId:
              policies.bookingWindow.versionId,
            bookingWindowPolicySource: policies.bookingWindow.source,
            bookingOpensMinutesBeforeStart:
              bookingValues.opensMinutesBeforeStart,
            bookingClosesMinutesBeforeStart:
              bookingValues.closesMinutesBeforeStart,
            cancellationsCloseMinutesBeforeStart:
              bookingValues.cancellationsCloseMinutesBeforeStart,
            blockClientCancellations: bookingValues.blockClientCancellations,
            isVirtual: input.isVirtual ?? false,
            color: input.color,
            pricingModel: input.pricingModel ?? "PACKAGE_ONLY",
            dropInPrice: input.dropInPrice,
            slidingScaleMinPrice: input.slidingScaleMinPrice,
            slidingScaleMaxPrice: input.slidingScaleMaxPrice,
            currency: input.currency ?? "GBP",
            waitlistEnabled: waitlistValues.mode !== "DISABLED",
            autoPromoteWaitlist: waitlistValues.mode === "OFFER_NEXT",
            waitlistPolicyOverrideId: input.waitlistPolicyOverrideId,
            resolvedWaitlistPolicyId: policies.waitlist.policyId,
            resolvedWaitlistPolicyVersionId: policies.waitlist.versionId,
            waitlistPolicySource: policies.waitlist.source,
            waitlistMode: waitlistValues.mode,
            waitlistAutomationClosesMinutesBeforeStart:
              waitlistValues.automationClosesMinutesBeforeStart,
            waitlistMaxEntries: waitlistValues.maxEntries,
            waitlistAllowOverlappingReservations:
              waitlistValues.allowOverlappingReservations,
            waitlistCreditHoldPolicy: waitlistValues.creditHoldPolicy,
            waitlistOfferExpiryMinutes: waitlistValues.offerExpiryMinutes,
            waitlistFailureFallback: waitlistValues.failureFallback,
            schedulingPolicySchemaVersion: 1,
            schedulingPolicyResolvedAt: resolvedAt,
            onlineBookingEnabled: input.onlineBookingEnabled ?? true,
            onlineCapacity: input.onlineCapacity,
            walkInCapacity: input.walkInCapacity,
            spotPickingEnabled: input.spotPickingEnabled ?? false,
            imageUrl: input.imageUrl,
            cancellationPolicyId: input.cancellationPolicyId,
            isRecurring: input.isRecurring ?? false,
            recurrenceRule: input.isRecurring
              ? input.recurrenceRule
              : undefined,
            metadata: seriesId ? { classSeriesId: seriesId } : undefined,
            status: "SCHEDULED" as const,
            organizationId,
            locationId: scope.locationId,
            createdAt: resolvedAt,
            updatedAt: resolvedAt,
          };
        });
        if (seriesId && input.recurrenceRule) {
          await tx.insert(classSeries).values({
            id: seriesId,
            organizationId,
            locationId: ctx.locationId ?? null,
            serviceTypeId: input.serviceTypeId,
            classTypeId: input.classTypeId,
            roomId: input.roomId,
            name: input.name,
            description: input.description,
            startDate: datePart(input.startTime),
            endDate: datePart(occurrences.at(-1)?.startTime ?? input.startTime),
            startTime: timePart(input.startTime),
            endTime: timePart(input.endTime),
            recurrenceRule: input.recurrenceRule,
            recurrenceDays: recurrenceDays(
              input.startTime,
              input.recurrenceRule,
            ),
            instructorIds: input.instructorId ? [input.instructorId] : [],
            capacity: input.maxCapacity,
            status: "ACTIVE",
            metadata: {
              pricingModel: input.pricingModel ?? "PACKAGE_ONLY",
              difficulty: input.difficulty,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await tx.insert(studioClass).values(rows);
      });

      const cls = await getClassWithRelations(firstId);
      if (!cls) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Class was created but could not be loaded",
        });
      }

      return mapClass(cls);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional().nullable(),
        startTime: z
          .string()
          .transform((value) => new Date(value))
          .optional(),
        endTime: z
          .string()
          .transform((value) => new Date(value))
          .optional(),
        maxCapacity: z.number().int().min(1).optional().nullable(),
        minCapacity: z.number().int().min(0).optional().nullable(),
        classTypeId: z.string().optional().nullable(),
        serviceTypeId: z.string().optional().nullable(),
        instructorId: z.string().optional().nullable(),
        roomId: z.string().optional().nullable(),
        difficulty: difficultySchema.optional().nullable(),
        equipmentNeeded: z.array(z.string()).optional(),
        bookingWindowHours: z.number().int().min(1).optional().nullable(),
        cancellationWindowHours: z.number().int().min(0).optional().nullable(),
        isVirtual: z.boolean().optional(),
        color: z.string().max(20).optional().nullable(),
        status: classStatusSchema.optional(),
        pricingModel: pricingModelSchema.optional(),
        dropInPrice: moneySchema.optional().nullable(),
        slidingScaleMinPrice: moneySchema.optional().nullable(),
        slidingScaleMaxPrice: moneySchema.optional().nullable(),
        currency: z.string().length(3).optional(),
        waitlistEnabled: z.boolean().optional(),
        autoPromoteWaitlist: z.boolean().optional(),
        onlineBookingEnabled: z.boolean().optional(),
        onlineCapacity: z.number().int().min(0).optional().nullable(),
        walkInCapacity: z.number().int().min(0).optional().nullable(),
        spotPickingEnabled: z.boolean().optional(),
        imageUrl: z.string().url().optional().nullable(),
        cancellationPolicyId: z.string().optional().nullable(),
        isRecurring: z.boolean().optional(),
        recurrenceRule: z.string().max(200).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "schedule.manage");

      const { id, ...data } = input;
      const existing = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, id),
          ...baseConditions(scope.organizationId, scope.locationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      await assertClassReferences(scope.organizationId, existing.locationId, {
        instructorId: data.instructorId ?? undefined,
        roomId: data.roomId ?? undefined,
        serviceTypeId: data.serviceTypeId ?? undefined,
        classTypeId: data.classTypeId ?? undefined,
        cancellationPolicyId: data.cancellationPolicyId ?? undefined,
      });
      const nextStartTime = data.startTime ?? existing.startTime;
      const nextEndTime = data.endTime ?? existing.endTime;
      if (nextEndTime <= nextStartTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      validateClassOptions({
        pricingModel: data.pricingModel ?? existing.pricingModel,
        dropInPrice:
          data.dropInPrice === undefined
            ? (existing.dropInPrice ?? undefined)
            : (data.dropInPrice ?? undefined),
        slidingScaleMinPrice:
          data.slidingScaleMinPrice === undefined
            ? (existing.slidingScaleMinPrice ?? undefined)
            : (data.slidingScaleMinPrice ?? undefined),
        slidingScaleMaxPrice:
          data.slidingScaleMaxPrice === undefined
            ? (existing.slidingScaleMaxPrice ?? undefined)
            : (data.slidingScaleMaxPrice ?? undefined),
        maxCapacity:
          data.maxCapacity === undefined
            ? (existing.maxCapacity ?? undefined)
            : (data.maxCapacity ?? undefined),
        onlineCapacity:
          data.onlineCapacity === undefined
            ? (existing.onlineCapacity ?? undefined)
            : (data.onlineCapacity ?? undefined),
        walkInCapacity:
          data.walkInCapacity === undefined
            ? (existing.walkInCapacity ?? undefined)
            : (data.walkInCapacity ?? undefined),
        waitlistEnabled: data.waitlistEnabled ?? existing.waitlistEnabled,
        autoPromoteWaitlist:
          data.autoPromoteWaitlist ?? existing.autoPromoteWaitlist,
        isRecurring: data.isRecurring ?? existing.isRecurring,
        recurrenceRule:
          data.recurrenceRule === undefined
            ? (existing.recurrenceRule ?? undefined)
            : (data.recurrenceRule ?? undefined),
      });

      const policyAffectingUpdate =
        data.startTime !== undefined ||
        data.serviceTypeId !== undefined ||
        data.bookingWindowHours !== undefined ||
        data.cancellationWindowHours !== undefined ||
        data.waitlistEnabled !== undefined ||
        data.autoPromoteWaitlist !== undefined;
      await db.transaction(async (tx) => {
        const schedulingData: Partial<typeof studioClass.$inferInsert> = {};
        if (policyAffectingUpdate) {
          const [policies] = await materializeSchedulingPoliciesForOccurrences({
            tx,
            organizationId: existing.organizationId,
            locationId: existing.locationId,
            serviceTypeId:
              data.serviceTypeId === undefined
                ? existing.serviceTypeId
                : data.serviceTypeId,
            bookingWindowPolicyOverrideId:
              existing.bookingWindowPolicyOverrideId,
            waitlistPolicyOverrideId: existing.waitlistPolicyOverrideId,
            startsAt: [nextStartTime],
            legacy: {
              bookingWindowHours:
                data.bookingWindowHours === undefined
                  ? existing.bookingWindowHours
                  : data.bookingWindowHours,
              cancellationWindowHours:
                data.cancellationWindowHours === undefined
                  ? existing.cancellationWindowHours
                  : data.cancellationWindowHours,
              waitlistEnabled: data.waitlistEnabled ?? existing.waitlistEnabled,
              autoPromoteWaitlist:
                data.autoPromoteWaitlist ?? existing.autoPromoteWaitlist,
            },
          });
          if (!policies) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Scheduling policies could not be resolved.",
            });
          }
          const bookingValues = policies.bookingWindow.values;
          const waitlistValues = policies.waitlist.values;
          assertSupportedWaitlistRuntime(waitlistValues);
          Object.assign(schedulingData, {
            bookingWindowHours: Math.ceil(
              bookingValues.opensMinutesBeforeStart / 60,
            ),
            cancellationWindowHours: Math.ceil(
              bookingValues.cancellationsCloseMinutesBeforeStart / 60,
            ),
            resolvedBookingWindowPolicyId: policies.bookingWindow.policyId,
            resolvedBookingWindowPolicyVersionId:
              policies.bookingWindow.versionId,
            bookingWindowPolicySource: policies.bookingWindow.source,
            bookingOpensMinutesBeforeStart:
              bookingValues.opensMinutesBeforeStart,
            bookingClosesMinutesBeforeStart:
              bookingValues.closesMinutesBeforeStart,
            cancellationsCloseMinutesBeforeStart:
              bookingValues.cancellationsCloseMinutesBeforeStart,
            blockClientCancellations: bookingValues.blockClientCancellations,
            waitlistEnabled: waitlistValues.mode !== "DISABLED",
            autoPromoteWaitlist: waitlistValues.mode === "OFFER_NEXT",
            resolvedWaitlistPolicyId: policies.waitlist.policyId,
            resolvedWaitlistPolicyVersionId: policies.waitlist.versionId,
            waitlistPolicySource: policies.waitlist.source,
            waitlistMode: waitlistValues.mode,
            waitlistAutomationClosesMinutesBeforeStart:
              waitlistValues.automationClosesMinutesBeforeStart,
            waitlistMaxEntries: waitlistValues.maxEntries,
            waitlistAllowOverlappingReservations:
              waitlistValues.allowOverlappingReservations,
            waitlistCreditHoldPolicy: waitlistValues.creditHoldPolicy,
            waitlistOfferExpiryMinutes: waitlistValues.offerExpiryMinutes,
            waitlistFailureFallback: waitlistValues.failureFallback,
            schedulingPolicySchemaVersion: 1,
            schedulingPolicyResolvedAt: new Date(),
          });
        }
        await tx
          .update(studioClass)
          .set({ ...data, ...schedulingData, updatedAt: new Date() })
          .where(
            and(
              eq(studioClass.id, id),
              eq(studioClass.organizationId, scope.organizationId),
              existing.locationId
                ? eq(studioClass.locationId, existing.locationId)
                : isNull(studioClass.locationId),
            ),
          );
      });

      const cls = await getClassWithRelations(id);
      if (!cls) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return mapClass(cls);
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const existing = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.id),
          eq(studioClass.organizationId, ctx.orgId),
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      if (existing.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already cancelled",
        });
      }

      const cancelledAt = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(studioClass)
          .set({ status: "CANCELLED", updatedAt: cancelledAt })
          .where(eq(studioClass.id, input.id));
        await tx
          .update(studioBooking)
          .set({ status: "CANCELLED" })
          .where(
            and(
              eq(studioBooking.classId, input.id),
              eq(studioBooking.status, "BOOKED"),
            ),
          );
        await tx
          .update(classWaitlist)
          .set({
            status: "CANCELLED_WAITLIST",
            respondedAt: cancelledAt,
            updatedAt: cancelledAt,
          })
          .where(
            and(
              eq(classWaitlist.classId, input.id),
              inArray(classWaitlist.status, ["WAITING", "NOTIFIED"]),
            ),
          );
      });

      const cls = await getClassWithRelations(input.id);
      if (!cls) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }
      return mapClass(cls);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "schedule.manage",
        resource: { organizationId: ctx.orgId, locationId: ctx.locationId },
      });
      const existing = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.id),
          ...baseConditions(ctx.orgId, ctx.locationId),
        ),
        columns: { id: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }
      if (existing.status !== "CANCELLED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cancel this class before deleting it.",
        });
      }
      const [bookings, checkIns, waitlist] = await Promise.all([
        db
          .select({ total: count() })
          .from(studioBooking)
          .where(eq(studioBooking.classId, input.id)),
        db
          .select({ total: count() })
          .from(checkIn)
          .where(eq(checkIn.classId, input.id)),
        db
          .select({ total: count() })
          .from(classWaitlist)
          .where(eq(classWaitlist.classId, input.id)),
      ]);
      if (
        (bookings[0]?.total ?? 0) +
          (checkIns[0]?.total ?? 0) +
          (waitlist[0]?.total ?? 0) >
        0
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This class has booking or attendance history and cannot be deleted.",
        });
      }
      await db
        .delete(studioClass)
        .where(
          and(
            eq(studioClass.id, input.id),
            ...baseConditions(ctx.orgId, ctx.locationId),
          ),
        );
      return { id: existing.id };
    }),

  duplicate: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        newStartTime: z.string().transform((value) => new Date(value)),
        newEndTime: z.string().transform((value) => new Date(value)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "schedule.manage");

      const original = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          ...baseConditions(scope.organizationId, scope.locationId),
        ),
      });

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const id = crypto.randomUUID();
      await db.transaction(async (tx) => {
        const [policies] = await materializeSchedulingPoliciesForOccurrences({
          tx,
          organizationId: original.organizationId,
          locationId: original.locationId,
          serviceTypeId: original.serviceTypeId,
          bookingWindowPolicyOverrideId: original.bookingWindowPolicyOverrideId,
          waitlistPolicyOverrideId: original.waitlistPolicyOverrideId,
          startsAt: [input.newStartTime],
          legacy: {
            bookingWindowHours: original.bookingWindowHours,
            cancellationWindowHours: original.cancellationWindowHours,
            waitlistEnabled: original.waitlistEnabled,
            autoPromoteWaitlist: original.autoPromoteWaitlist,
          },
        });
        if (!policies) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Scheduling policies could not be resolved.",
          });
        }
        assertSupportedWaitlistRuntime(policies.waitlist.values);
        const bookingValues = policies.bookingWindow.values;
        const waitlistValues = policies.waitlist.values;
        const now = new Date();
        await tx.insert(studioClass).values({
          id,
          name: original.name,
          description: original.description,
          startTime: input.newStartTime,
          endTime: input.newEndTime,
          maxCapacity: original.maxCapacity,
          minCapacity: original.minCapacity,
          classTypeId: original.classTypeId,
          serviceTypeId: original.serviceTypeId,
          instructorId: original.instructorId,
          roomId: original.roomId,
          roomName: original.roomName,
          difficulty: original.difficulty,
          equipmentNeeded: original.equipmentNeeded,
          bookingWindowHours: Math.ceil(
            bookingValues.opensMinutesBeforeStart / 60,
          ),
          cancellationWindowHours: Math.ceil(
            bookingValues.cancellationsCloseMinutesBeforeStart / 60,
          ),
          bookingWindowPolicyOverrideId: original.bookingWindowPolicyOverrideId,
          resolvedBookingWindowPolicyId: policies.bookingWindow.policyId,
          resolvedBookingWindowPolicyVersionId:
            policies.bookingWindow.versionId,
          bookingWindowPolicySource: policies.bookingWindow.source,
          bookingOpensMinutesBeforeStart: bookingValues.opensMinutesBeforeStart,
          bookingClosesMinutesBeforeStart:
            bookingValues.closesMinutesBeforeStart,
          cancellationsCloseMinutesBeforeStart:
            bookingValues.cancellationsCloseMinutesBeforeStart,
          blockClientCancellations: bookingValues.blockClientCancellations,
          isVirtual: original.isVirtual,
          color: original.color,
          pricingModel: original.pricingModel,
          dropInPrice: original.dropInPrice,
          slidingScaleMinPrice: original.slidingScaleMinPrice,
          slidingScaleMaxPrice: original.slidingScaleMaxPrice,
          currency: original.currency,
          waitlistEnabled: waitlistValues.mode !== "DISABLED",
          autoPromoteWaitlist: waitlistValues.mode === "OFFER_NEXT",
          waitlistPolicyOverrideId: original.waitlistPolicyOverrideId,
          resolvedWaitlistPolicyId: policies.waitlist.policyId,
          resolvedWaitlistPolicyVersionId: policies.waitlist.versionId,
          waitlistPolicySource: policies.waitlist.source,
          waitlistMode: waitlistValues.mode,
          waitlistAutomationClosesMinutesBeforeStart:
            waitlistValues.automationClosesMinutesBeforeStart,
          waitlistMaxEntries: waitlistValues.maxEntries,
          waitlistAllowOverlappingReservations:
            waitlistValues.allowOverlappingReservations,
          waitlistCreditHoldPolicy: waitlistValues.creditHoldPolicy,
          waitlistOfferExpiryMinutes: waitlistValues.offerExpiryMinutes,
          waitlistFailureFallback: waitlistValues.failureFallback,
          schedulingPolicySchemaVersion: 1,
          schedulingPolicyResolvedAt: now,
          onlineBookingEnabled: original.onlineBookingEnabled,
          onlineCapacity: original.onlineCapacity,
          walkInCapacity: original.walkInCapacity,
          spotPickingEnabled: original.spotPickingEnabled,
          imageUrl: original.imageUrl,
          cancellationPolicyId: original.cancellationPolicyId,
          isRecurring: original.isRecurring,
          recurrenceRule: original.recurrenceRule,
          status: "SCHEDULED",
          organizationId: original.organizationId,
          locationId: original.locationId,
          createdAt: now,
          updatedAt: now,
        });
      });

      const cls = await getClassWithRelations(id);
      if (!cls) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Class was duplicated but could not be loaded",
        });
      }

      return mapClass(cls);
    }),
});

async function assertClassReferences(
  organizationId: string,
  locationId: string | null,
  refs: {
    instructorId?: string | null;
    roomId?: string | null;
    classTypeId?: string | null;
    serviceTypeId?: string | null;
    cancellationPolicyId?: string | null;
  },
) {
  if (refs.instructorId) {
    const record = await db.query.instructor.findFirst({
      where: and(
        eq(instructor.id, refs.instructorId),
        eq(instructor.organizationId, organizationId),
        locationId
          ? eq(instructor.locationId, locationId)
          : isNull(instructor.locationId),
      ),
      columns: { id: true },
    });
    if (!record) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Instructor not found",
      });
    }
  }

  if (refs.roomId) {
    const record = await db.query.room.findFirst({
      where: and(
        eq(room.id, refs.roomId),
        eq(room.organizationId, organizationId),
        locationId ? eq(room.locationId, locationId) : isNull(room.locationId),
      ),
      columns: { id: true },
    });
    if (!record) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Room not found" });
    }
  }

  if (refs.classTypeId) {
    const record = await db.query.classType.findFirst({
      where: and(
        eq(classType.id, refs.classTypeId),
        eq(classType.organizationId, organizationId),
        locationId
          ? eq(classType.locationId, locationId)
          : isNull(classType.locationId),
      ),
      columns: { id: true },
    });
    if (!record) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Class type not found",
      });
    }
  }

  if (refs.serviceTypeId) {
    const record = await db.query.serviceType.findFirst({
      where: and(
        eq(serviceType.id, refs.serviceTypeId),
        eq(serviceType.organizationId, organizationId),
        locationId
          ? eq(serviceType.locationId, locationId)
          : isNull(serviceType.locationId),
      ),
      columns: { id: true },
    });
    if (!record) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Service type not found",
      });
    }
  }

  if (refs.cancellationPolicyId) {
    const record = await db.query.cancellationPolicy.findFirst({
      where: and(
        eq(cancellationPolicy.id, refs.cancellationPolicyId),
        eq(cancellationPolicy.organizationId, organizationId),
        eq(cancellationPolicy.isActive, true),
        locationId
          ? eq(cancellationPolicy.locationId, locationId)
          : isNull(cancellationPolicy.locationId),
      ),
      columns: { id: true },
    });
    if (!record) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Active cancellation policy not found",
      });
    }
  }
}

function assertSupportedWaitlistRuntime(values: WaitlistValues): void {
  if (!supportsWaitlistRuntime(values)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "This waitlist policy requires automation that is not enabled for class creation yet.",
    });
  }
}
