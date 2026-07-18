import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  classSeries,
  classType,
  instructor,
  room,
  serviceType,
  studioClass,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const statusSchema = z.enum(["ACTIVE", "PAUSED", "CANCELLED"]);

function requireOrganization(orgId: string | null) {
  if (!orgId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
  }
  return orgId;
}

export const classSeriesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().trim().optional(),
        statuses: z.array(statusSchema).optional(),
        serviceTypeId: z.string().trim().min(1).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const conditions: SQL[] = [
        eq(classSeries.organizationId, orgId),
        ctx.locationId
          ? eq(classSeries.locationId, ctx.locationId)
          : isNull(classSeries.locationId),
      ];
      if (input?.statuses?.length) {
        conditions.push(inArray(classSeries.status, input.statuses));
      }
      if (input?.serviceTypeId) {
        conditions.push(eq(classSeries.serviceTypeId, input.serviceTypeId));
      }
      if (input?.search) {
        conditions.push(
          or(
            ilike(classSeries.name, `%${input.search}%`),
            ilike(classSeries.description, `%${input.search}%`),
          )!,
        );
      }

      const seriesIdExpression = sql<string>`${studioClass.metadata}->>'classSeriesId'`;
      const [seriesRows, countRows] = await Promise.all([
        db
          .select({
            id: classSeries.id,
            name: classSeries.name,
            description: classSeries.description,
            startDate: classSeries.startDate,
            endDate: classSeries.endDate,
            startTime: classSeries.startTime,
            endTime: classSeries.endTime,
            recurrenceRule: classSeries.recurrenceRule,
            recurrenceDays: classSeries.recurrenceDays,
            instructorIds: classSeries.instructorIds,
            capacity: classSeries.capacity,
            status: classSeries.status,
            createdAt: classSeries.createdAt,
            updatedAt: classSeries.updatedAt,
            serviceTypeId: classSeries.serviceTypeId,
            serviceTypeName: serviceType.name,
            classTypeName: classType.name,
            classTypeColor: classType.color,
            roomName: room.name,
          })
          .from(classSeries)
          .leftJoin(serviceType, eq(serviceType.id, classSeries.serviceTypeId))
          .leftJoin(classType, eq(classType.id, classSeries.classTypeId))
          .leftJoin(room, eq(room.id, classSeries.roomId))
          .where(and(...conditions))
          .orderBy(desc(classSeries.updatedAt), asc(classSeries.name)),
        db
          .select({
            seriesId: seriesIdExpression,
            total: count(studioClass.id),
          })
          .from(studioClass)
          .where(
            and(
              eq(studioClass.organizationId, orgId),
              ctx.locationId
                ? eq(studioClass.locationId, ctx.locationId)
                : isNull(studioClass.locationId),
              sql`${studioClass.metadata}->>'classSeriesId' IS NOT NULL`,
            ),
          )
          .groupBy(seriesIdExpression),
      ]);

      const counts = new Map(countRows.map((row) => [row.seriesId, row.total]));
      const instructorIds = Array.from(
        new Set(seriesRows.flatMap((row) => row.instructorIds ?? [])),
      );
      const instructors =
        instructorIds.length > 0
          ? await db.query.instructor.findMany({
              where: inArray(instructor.id, instructorIds),
              columns: { id: true, name: true },
            })
          : [];
      const instructorNames = new Map(instructors.map((row) => [row.id, row.name]));

      return seriesRows.map((row) => ({
        ...row,
        occurrenceCount: counts.get(row.id) ?? 0,
        instructors: (row.instructorIds ?? []).map((id) => ({
          id,
          name: instructorNames.get(id) ?? "Unknown instructor",
        })),
      }));
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: statusSchema }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrganization(ctx.orgId);
      const [updated] = await db
        .update(classSeries)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(classSeries.id, input.id),
            eq(classSeries.organizationId, orgId),
            ctx.locationId
              ? eq(classSeries.locationId, ctx.locationId)
              : isNull(classSeries.locationId),
          ),
        )
        .returning({ id: classSeries.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class series not found" });
      }

      return updated;
    }),
});
