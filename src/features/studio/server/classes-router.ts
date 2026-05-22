import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
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
  classType,
  classWaitlist,
  instructor,
  room,
  studioBooking,
  studioClass,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

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
    instructor: { columns: { id: true, name: true, email: true } },
    room: { columns: { id: true, name: true, capacity: true } },
    studioBookings: {
      columns: {
        id: true,
        status: true,
        bookedAt: true,
        checkedInAt: true,
        cancelledAt: true,
        clientId: true,
      },
      with: {
        client: { columns: { id: true, name: true, email: true, phone: true } },
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
      })
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
        ctx.locationId
      );

      if (input.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          or(
            ilike(studioClass.name, pattern),
            ilike(studioClass.description, pattern)
          )
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
          orderBy: asc(studioClass.startTime),
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
          ...baseConditions(ctx.orgId, ctx.locationId)
        ),
        with: classRelations(),
      });

      if (!cls) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return mapClass(cls);
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
          ne(studioClass.status, "CANCELLED")
        ),
        with: classRelations(),
        orderBy: asc(studioClass.startTime),
      });

      return groupByDay(classes.map(mapClass));
    }),

  upcoming: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
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
          ne(studioClass.status, "CANCELLED")
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
        db.select({ total: count() }).from(studioClass).where(and(...scope)),
        db
          .select({ total: count() })
          .from(studioClass)
          .where(
            and(
              ...scope,
              gte(studioClass.startTime, now),
              lte(studioClass.startTime, nextWeek),
              eq(studioClass.status, "SCHEDULED")
            )
          ),
        db
          .select({ total: count() })
          .from(studioClass)
          .where(
            and(
              ...scope,
              gte(studioClass.startTime, today),
              lt(studioClass.startTime, tomorrow)
            )
          ),
        db
          .select({ total: count() })
          .from(checkIn)
          .where(
            and(
              eq(checkIn.organizationId, ctx.orgId),
              ctx.locationId ? eq(checkIn.locationId, ctx.locationId) : undefined
            )
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
        classTypeId: z.string().optional(),
        instructorId: z.string().optional(),
        roomId: z.string().optional(),
        difficulty: difficultySchema.optional(),
        equipmentNeeded: z.array(z.string()).optional(),
        bookingWindowHours: z.number().int().min(1).optional(),
        cancellationWindowHours: z.number().int().min(0).optional(),
        isVirtual: z.boolean().optional(),
        color: z.string().max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      await assertClassReferences(ctx.orgId, {
        instructorId: input.instructorId,
        roomId: input.roomId,
        classTypeId: input.classTypeId,
      });

      const id = crypto.randomUUID();
      await db.insert(studioClass).values({
        id,
        name: input.name,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        maxCapacity: input.maxCapacity,
        minCapacity: input.minCapacity,
        classTypeId: input.classTypeId,
        instructorId: input.instructorId,
        roomId: input.roomId,
        difficulty: input.difficulty,
        equipmentNeeded: input.equipmentNeeded ?? [],
        bookingWindowHours: input.bookingWindowHours,
        cancellationWindowHours: input.cancellationWindowHours,
        isVirtual: input.isVirtual ?? false,
        color: input.color,
        status: "SCHEDULED",
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const cls = await getClassWithRelations(id);
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
        startTime: z.string().transform((value) => new Date(value)).optional(),
        endTime: z.string().transform((value) => new Date(value)).optional(),
        maxCapacity: z.number().int().min(1).optional().nullable(),
        minCapacity: z.number().int().min(0).optional().nullable(),
        classTypeId: z.string().optional().nullable(),
        instructorId: z.string().optional().nullable(),
        roomId: z.string().optional().nullable(),
        difficulty: difficultySchema.optional().nullable(),
        equipmentNeeded: z.array(z.string()).optional(),
        bookingWindowHours: z.number().int().min(1).optional().nullable(),
        cancellationWindowHours: z.number().int().min(0).optional().nullable(),
        isVirtual: z.boolean().optional(),
        color: z.string().max(20).optional().nullable(),
        status: classStatusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const { id, ...data } = input;
      const existing = await db.query.studioClass.findFirst({
        where: and(eq(studioClass.id, id), eq(studioClass.organizationId, ctx.orgId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      await assertClassReferences(ctx.orgId, {
        instructorId: data.instructorId ?? undefined,
        roomId: data.roomId ?? undefined,
        classTypeId: data.classTypeId ?? undefined,
      });

      await db
        .update(studioClass)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(studioClass.id, id));

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
          eq(studioClass.organizationId, ctx.orgId)
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      if (existing.status === "CANCELLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already cancelled" });
      }

      await db.transaction(async (tx) => {
        await tx
          .update(studioClass)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(eq(studioClass.id, input.id));
        await tx
          .update(studioBooking)
          .set({ status: "CANCELLED" })
          .where(
            and(eq(studioBooking.classId, input.id), eq(studioBooking.status, "BOOKED"))
          );
        await tx
          .update(classWaitlist)
          .set({ status: "CANCELLED_WAITLIST" })
          .where(
            and(
              eq(classWaitlist.classId, input.id),
              eq(classWaitlist.status, "WAITING")
            )
          );
      });

      const cls = await getClassWithRelations(input.id);
      if (!cls) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }
      return mapClass(cls);
    }),

  duplicate: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        newStartTime: z.string().transform((value) => new Date(value)),
        newEndTime: z.string().transform((value) => new Date(value)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const original = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, ctx.orgId)
        ),
      });

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const id = crypto.randomUUID();
      await db.insert(studioClass).values({
        id,
        name: original.name,
        description: original.description,
        startTime: input.newStartTime,
        endTime: input.newEndTime,
        maxCapacity: original.maxCapacity,
        minCapacity: original.minCapacity,
        classTypeId: original.classTypeId,
        instructorId: original.instructorId,
        roomId: original.roomId,
        roomName: original.roomName,
        difficulty: original.difficulty,
        equipmentNeeded: original.equipmentNeeded,
        bookingWindowHours: original.bookingWindowHours,
        cancellationWindowHours: original.cancellationWindowHours,
        isVirtual: original.isVirtual,
        color: original.color,
        status: "SCHEDULED",
        organizationId: original.organizationId,
        locationId: original.locationId,
        createdAt: new Date(),
        updatedAt: new Date(),
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
  refs: {
    instructorId?: string | null;
    roomId?: string | null;
    classTypeId?: string | null;
  }
) {
  if (refs.instructorId) {
    const record = await db.query.instructor.findFirst({
      where: and(
        eq(instructor.id, refs.instructorId),
        eq(instructor.organizationId, organizationId)
      ),
      columns: { id: true },
    });
    if (!record) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Instructor not found" });
    }
  }

  if (refs.roomId) {
    const record = await db.query.room.findFirst({
      where: and(eq(room.id, refs.roomId), eq(room.organizationId, organizationId)),
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
        eq(classType.organizationId, organizationId)
      ),
      columns: { id: true },
    });
    if (!record) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Class type not found" });
    }
  }
}
