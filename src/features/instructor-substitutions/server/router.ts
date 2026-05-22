import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, ne, or } from "drizzle-orm";
import { z } from "zod";

import { MessageDirection, SmsStatus } from "@/db/enums";
import { db } from "@/db";
import {
  instructor,
  instructorAvailability,
  instructorSubstitutionRequest,
  smsConfig,
  smsMessage,
  studioClass,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const substitutionStatuses = [
  "OPEN",
  "OFFERED",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
] as const;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function requireOrg(ctx: { orgId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context is required",
    });
  }
  return ctx.orgId;
}

async function findAvailableSubstitutes(params: {
  organizationId: string;
  locationId: string | null;
  classId: string;
  originalInstructorId: string | null;
  startTime: Date;
  endTime: Date;
  classTypeName: string | null;
}) {
  const dayOfWeek = params.startTime.getDay();
  const startMinutes = params.startTime.getHours() * 60 + params.startTime.getMinutes();
  const endMinutes = params.endTime.getHours() * 60 + params.endTime.getMinutes();

  const instructors = await db.query.instructor.findMany({
    where: and(
      eq(instructor.organizationId, params.organizationId),
      params.locationId ? eq(instructor.locationId, params.locationId) : undefined,
      eq(instructor.isActive, true),
      params.originalInstructorId ? ne(instructor.id, params.originalInstructorId) : undefined,
    ),
    with: {
      instructorAvailabilities: {
        where: and(
          eq(instructorAvailability.dayOfWeek, dayOfWeek),
          eq(instructorAvailability.isActive, true),
          lte(instructorAvailability.effectiveFrom, params.startTime),
          or(
            gte(instructorAvailability.effectiveTo, params.startTime),
            isNull(instructorAvailability.effectiveTo),
          ),
        ),
      },
      studioClasses: {
        where: and(
          ne(studioClass.id, params.classId),
          ne(studioClass.status, "CANCELLED"),
          lt(studioClass.startTime, params.endTime),
          gt(studioClass.endTime, params.startTime),
        ),
        columns: { id: true },
      },
    },
    orderBy: asc(instructor.name),
  });

  return instructors
    .filter((candidate) => {
      if (candidate.studioClasses.length > 0) {
        return false;
      }

      const availability =
        candidate.instructorAvailabilities.length === 0 ||
        candidate.instructorAvailabilities.some((item) => {
          const availableStart = timeToMinutes(item.startTime);
          const availableEnd = timeToMinutes(item.endTime);
          return availableStart <= startMinutes && availableEnd >= endMinutes;
        });
      if (!availability) {
        return false;
      }

      if (!params.classTypeName) {
        return true;
      }

      const classType = params.classTypeName.toLowerCase();
      const classTypes = candidate.instructorClassTypes ?? [];
      const specialties = candidate.instructorSpecialties ?? [];
      return (
        classTypes.length === 0 ||
        classTypes.some((item) => item.toLowerCase() === classType) ||
        specialties.some((item) => item.toLowerCase().includes(classType))
      );
    })
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      role: candidate.role,
      instructorClassTypes: candidate.instructorClassTypes ?? [],
      instructorSpecialties: candidate.instructorSpecialties ?? [],
    }));
}

export const instructorSubstitutionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(substitutionStatuses).optional(),
          classId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);

      const rows = await db.query.instructorSubstitutionRequest.findMany({
        where: and(
          eq(instructorSubstitutionRequest.organizationId, organizationId),
          ctx.locationId ? eq(instructorSubstitutionRequest.locationId, ctx.locationId) : undefined,
          input?.status ? eq(instructorSubstitutionRequest.status, input.status) : undefined,
          input?.classId ? eq(instructorSubstitutionRequest.classId, input.classId) : undefined,
        ),
        orderBy: desc(instructorSubstitutionRequest.requestedAt),
        with: {
          studioClass: {
            with: {
              classType: { columns: { id: true, name: true, color: true } },
              room: { columns: { id: true, name: true } },
            },
          },
          instructor_originalInstructorId: {
            columns: { id: true, name: true, email: true },
          },
          instructor_substituteId: {
            columns: { id: true, name: true, email: true, phone: true },
          },
        },
      });

      return rows.map((row) => ({
        ...row,
        originalInstructor: row.instructor_originalInstructorId,
        substitute: row.instructor_substituteId,
      }));
    }),

  candidates: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const locationId = ctx.locationId ?? null;

      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId),
          locationId ? eq(studioClass.locationId, locationId) : undefined,
        ),
        with: { classType: { columns: { name: true } } },
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return findAvailableSubstitutes({
        organizationId,
        locationId,
        classId: targetClass.id,
        originalInstructorId: targetClass.instructorId,
        startTime: targetClass.startTime,
        endTime: targetClass.endTime,
        classTypeName: targetClass.classType?.name ?? null,
      });
    }),

  requestForClass: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        reason: z.string().max(500).optional(),
        expiresAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const locationId = ctx.locationId ?? null;
      const targetClass = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, organizationId),
          locationId ? eq(studioClass.locationId, locationId) : undefined,
        ),
        with: {
          classType: { columns: { name: true } },
          instructor: { columns: { id: true, name: true } },
        },
      });
      if (!targetClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const candidates = await findAvailableSubstitutes({
        organizationId,
        locationId,
        classId: targetClass.id,
        originalInstructorId: targetClass.instructorId,
        startTime: targetClass.startTime,
        endTime: targetClass.endTime,
        classTypeName: targetClass.classType?.name ?? null,
      });

      const config = await db.query.smsConfig.findFirst({
        where: eq(smsConfig.organizationId, organizationId),
        columns: { fromNumber: true, isActive: true },
      });

      const requests = await db.transaction(async (tx) => {
        const createdRequests =
          candidates.length > 0
            ? await tx
                .insert(instructorSubstitutionRequest)
                .values(
                  candidates.map((candidate) => ({
                    id: randomUUID(),
                    organizationId,
                    locationId,
                    classId: targetClass.id,
                    originalInstructorId: targetClass.instructorId,
                    substituteId: candidate.id,
                    status: "OFFERED" as const,
                    reason: input.reason?.trim() || null,
                    expiresAt: input.expiresAt ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  })),
                )
                .returning()
            : await tx
                .insert(instructorSubstitutionRequest)
                .values({
                  id: randomUUID(),
                  organizationId,
                  locationId,
                  classId: targetClass.id,
                  originalInstructorId: targetClass.instructorId,
                  status: "OPEN",
                  reason: input.reason?.trim() || null,
                  expiresAt: input.expiresAt ?? null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .returning();

        const messages = candidates
          .filter((candidate) => candidate.phone)
          .map((candidate) => ({
            id: randomUUID(),
            organizationId,
            locationId,
            to: candidate.phone || "",
            from: config?.fromNumber ?? "",
            body: `Sub cover needed for ${targetClass.name} on ${targetClass.startTime.toLocaleString()}. Reply to the studio if available.`,
            direction: MessageDirection.OUTBOUND,
            status: SmsStatus.QUEUED,
            createdAt: new Date(),
          }));
        if (config?.isActive && messages.length > 0) {
          await tx.insert(smsMessage).values(messages);
        }

        return createdRequests;
      });

      return { requests, candidateCount: candidates.length };
    }),

  accept: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const request = await db.query.instructorSubstitutionRequest.findFirst({
        where: and(
          eq(instructorSubstitutionRequest.id, input.requestId),
          eq(instructorSubstitutionRequest.organizationId, organizationId),
          ctx.locationId ? eq(instructorSubstitutionRequest.locationId, ctx.locationId) : undefined,
        ),
        columns: { id: true, classId: true, substituteId: true, status: true },
      });
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Substitution request not found",
        });
      }

      const instructorRecord = await db.query.instructor.findFirst({
        where: eq(instructor.userId, ctx.auth.user.id),
        columns: { id: true },
      });
      if (
        instructorRecord &&
        request.substituteId &&
        request.substituteId !== instructorRecord.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only accept substitution requests assigned to you",
        });
      }

      const substituteId =
        request.substituteId ??
        (request.status === "OPEN" && instructorRecord ? instructorRecord.id : null);
      if (!substituteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No substitute instructor identified for this request",
        });
      }

      return db.transaction(async (tx) => {
        const freshRequest = await tx.query.instructorSubstitutionRequest.findFirst({
          where: eq(instructorSubstitutionRequest.id, request.id),
          columns: { status: true, classId: true },
        });
        if (
          !freshRequest ||
          (freshRequest.status !== "OFFERED" && freshRequest.status !== "OPEN")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This substitution request has already been handled by another instructor",
          });
        }

        const alreadyAccepted = await tx.query.instructorSubstitutionRequest.findFirst({
          where: and(
            eq(instructorSubstitutionRequest.classId, freshRequest.classId),
            eq(instructorSubstitutionRequest.status, "ACCEPTED"),
          ),
          columns: { id: true },
        });
        if (alreadyAccepted) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Another instructor has already accepted this class",
          });
        }

        await tx
          .update(studioClass)
          .set({ instructorId: substituteId, updatedAt: new Date() })
          .where(eq(studioClass.id, freshRequest.classId));

        await tx
          .update(instructorSubstitutionRequest)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(
            and(
              eq(instructorSubstitutionRequest.classId, freshRequest.classId),
              ne(instructorSubstitutionRequest.id, request.id),
              inArray(instructorSubstitutionRequest.status, ["OFFERED", "OPEN"]),
            ),
          );

        const [accepted] = await tx
          .update(instructorSubstitutionRequest)
          .set({
            status: "ACCEPTED",
            substituteId,
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(instructorSubstitutionRequest.id, request.id))
          .returning();

        return accepted;
      });
    }),
});
