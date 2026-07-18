import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { addHours } from "date-fns";
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNull, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { ActivityAction } from "@/db/enums";
import { db } from "@/db";
import {
  instructor as instructorTable,
  instructorDocument as instructorDocumentTable,
  invoice as invoiceTable,
  locationMember,
  member,
  rota as rotaTable,
  studioClass as studioClassTable,
  timeLog,
  timeLog as timeLogTable,
  user,
} from "@/db/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import {
  generateInstructorMagicLinkToken,
  hashInstructorMagicLinkToken,
} from "@/features/instructors/lib/magic-link-token";

const MAGIC_LINK_EXPIRY_HOURS = 24;

async function getCurrentInstructor(userId: string) {
  return db.query.instructor.findFirst({
    where: eq(instructorTable.userId, userId),
  });
}

function normalizeClassWithBookingCount<
  T extends { studioBookings?: unknown[]; bookedCount?: number },
>(studioClass: T) {
  const studioBooking = studioClass.studioBookings?.length ?? studioClass.bookedCount ?? 0;
  return {
    ...studioClass,
    _count: { studioBooking },
    bookingCount: studioBooking,
  };
}

export const instructorsRouter = createTRPCRouter({
  // List instructors (CRM side)
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        roles: z.array(z.string()).optional(),
        rateMin: z.number().optional(),
        rateMax: z.number().optional(),
        createdAfter: z.date().optional(),
        createdBefore: z.date().optional(),
        locationId: z.string().optional(), // Override for "all-clients" view
        includeAllClients: z.boolean().optional(), // Flag to include all clients
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      // Use input locationId if provided, otherwise use context locationId
      const locationId = input.locationId !== undefined
        ? (input.locationId || null)
        : ctx.locationId;

      const conditions: SQL[] = [eq(instructorTable.organizationId, ctx.orgId)];
      if (!input.includeAllClients) {
        conditions.push(locationId ? eq(instructorTable.locationId, locationId) : isNull(instructorTable.locationId));
      }
      conditions.push(eq(instructorTable.isSystem, false));
      conditions.push(
        or(
          isNull(instructorTable.mindbodyTrainerId),
          sql`${instructorTable.customFields}->'raw'->>'Teacher' = 'True'`,
          sql`${instructorTable.customFields}->'raw'->>'AppointmentTrn' = 'True'`,
          sql`${instructorTable.customFields}->'raw'->>'ReservationTrn' = 'True'`,
          sql`${instructorTable.customFields}->'raw'->>'Workshop Instructor' = 'True'`,
        )!,
      );

      if (input.search) {
        const term = `%${input.search}%`;
        const searchCondition = or(
          ilike(instructorTable.name, term),
          ilike(instructorTable.email, term),
          ilike(instructorTable.phone, term),
          ilike(instructorTable.employeeId, term),
          ilike(instructorTable.role, term),
        );
        if (searchCondition) conditions.push(searchCondition);
      }

      conditions.push(eq(instructorTable.isActive, input.isActive ?? true));

      if (input.roles && input.roles.length > 0) {
        conditions.push(inArray(instructorTable.role, input.roles));
      }

      if (input.rateMin !== undefined) {
        conditions.push(gte(instructorTable.hourlyRate, String(input.rateMin)));
      }
      if (input.rateMax !== undefined) {
        conditions.push(lte(instructorTable.hourlyRate, String(input.rateMax)));
      }

      if (input.createdAfter) {
        conditions.push(gte(instructorTable.createdAt, input.createdAfter));
      }
      if (input.createdBefore) {
        conditions.push(lte(instructorTable.createdAt, input.createdBefore));
      }

      const where = and(...conditions);
      const totalItems = await db.$count(instructorTable, where);

      const instructors = await db.query.instructor.findMany({
        where,
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
        orderBy: desc(instructorTable.createdAt),
      });
      const instructorIds = instructors.map((instructor) => instructor.id);
      const timeLogCounts = instructorIds.length
        ? await db
            .select({ instructorId: timeLog.instructorId, total: count() })
            .from(timeLog)
            .where(inArray(timeLog.instructorId, instructorIds))
            .groupBy(timeLog.instructorId)
        : [];
      const timeLogCountByInstructor = new Map(
        timeLogCounts
          .filter((row) => row.instructorId)
          .map((row) => [row.instructorId, row.total]),
      );

      const totalPages = Math.ceil(totalItems / input.pageSize);

      return {
        items: instructors.map((instructor) => ({
          ...instructor,
          _count: { timeLog: timeLogCountByInstructor.get(instructor.id) ?? 0 },
        })),
        pagination: {
          currentPage: input.page,
          totalPages,
          pageSize: input.pageSize,
          totalItems,
        },
      };
    }),

  // Get single instructor (CRM side)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.id),
          eq(instructorTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(instructorTable.locationId, ctx.locationId)
            : isNull(instructorTable.locationId),
        ),
        with: {
          timeLogs: {
            limit: 10,
            orderBy: desc(timeLogTable.startTime),
            with: {
              deal: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      return {
        ...instructor,
        timeLog: instructor.timeLogs,
      };
    }),

  // Create instructor (CRM side)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        employeeId: z.string().optional(),
        hourlyRate: z.number().optional(),
        currency: z.string().optional(),
        role: z.string().optional(),
        bio: z.string().optional(),
        instructorCertifications: z.array(z.string()).optional(),
        instructorSpecialties: z.array(z.string()).optional(),
        instructorClassTypes: z.array(z.string()).optional(),
        publicProfileSlug: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      // Validate that at least email or phone is provided
      if (!input.email && !input.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either email or phone must be provided",
        });
      }

      const [instructor] = await db
        .insert(instructorTable)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          name: input.name,
          email: input.email,
          phone: input.phone,
          employeeId: input.employeeId,
          hourlyRate:
            input.hourlyRate === undefined ? undefined : String(input.hourlyRate),
          currency: input.currency,
          role: input.role,
          bio: input.bio,
          instructorCertifications: input.instructorCertifications ?? [],
          instructorSpecialties: input.instructorSpecialties ?? [],
          instructorClassTypes: input.instructorClassTypes ?? [],
          publicProfileSlug: input.publicProfileSlug,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!instructor) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create instructor",
        });
      }

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "instructor",
        entityId: instructor.id,
        entityName: instructor.name,
        metadata: {
          email: instructor.email,
          role: instructor.role,
          hourlyRate: instructor.hourlyRate?.toString(),
        },
        posthogProperties: {
          has_email: !!instructor.email,
          has_phone: !!instructor.phone,
          has_hourly_rate: !!instructor.hourlyRate,
          role: instructor.role,
          currency: instructor.currency,
        },
      });

      return instructor;
    }),

  // Update instructor (CRM side)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        employeeId: z.string().optional(),
        hourlyRate: z.number().optional(),
        currency: z.string().optional(),
        role: z.string().optional(),
        isActive: z.boolean().optional(),
        bio: z.string().optional(),
        instructorCertifications: z.array(z.string()).optional(),
        instructorSpecialties: z.array(z.string()).optional(),
        instructorClassTypes: z.array(z.string()).optional(),
        publicProfileSlug: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.id),
          eq(instructorTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(instructorTable.locationId, ctx.locationId)
            : isNull(instructorTable.locationId),
        ),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const { id, ...updateData } = input;

      const [updated] = await db
        .update(instructorTable)
        .set({
          ...updateData,
          hourlyRate: updateData.hourlyRate !== undefined ? String(updateData.hourlyRate) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(instructorTable.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update instructor",
        });
      }

      // Log analytics - convert data for comparison
      const instructorForComparison = { ...instructor, hourlyRate: instructor.hourlyRate ? Number(instructor.hourlyRate) : null };
      const changes = getChangedFields(instructorForComparison, updateData);
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "instructor",
        entityId: updated.id,
        entityName: updated.name,
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          is_active: updated.isActive,
        },
      });

      return updated;
    }),

  // Delete instructor (CRM side)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.id),
          eq(instructorTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(instructorTable.locationId, ctx.locationId)
            : isNull(instructorTable.locationId),
        ),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      await db.delete(instructorTable).where(eq(instructorTable.id, input.id));

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "instructor",
        entityId: instructor.id,
        entityName: instructor.name,
        metadata: {
          role: instructor.role,
        },
        posthogProperties: {
          role: instructor.role,
        },
      });

      return { success: true };
    }),

  // Generate magic link (CRM side)
  generateMagicLink: protectedProcedure
    .input(z.object({ instructorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.instructorId),
          eq(instructorTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(instructorTable.locationId, ctx.locationId)
            : isNull(instructorTable.locationId),
        ),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      // Generate token and hash it
      const { token, tokenDigest: hashedToken } =
        generateInstructorMagicLinkToken();

      // Store hashed token and expiry
      await db
        .update(instructorTable)
        .set({
          portalToken: hashedToken,
          portalTokenExpiry: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
          updatedAt: new Date(),
        })
        .where(eq(instructorTable.id, instructor.id));

      // Generate magic link URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const magicLink = `${baseUrl}/instructor-signup?token=${token}&id=${instructor.id}`;

      return {
        magicLink,
        expiresAt: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
      };
    }),

  // Send magic link via email
  sendMagicLinkEmail: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.instructorId),
          eq(instructorTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(instructorTable.locationId, ctx.locationId)
            : isNull(instructorTable.locationId),
        ),
        with: {
          organization: {
            columns: {
              name: true,
            },
          },
          location: {
            columns: {
              companyName: true,
            },
          },
        },
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      if (!instructor.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Instructor does not have an email address",
        });
      }

      // Generate magic link
      const { token, tokenDigest: hashedToken } =
        generateInstructorMagicLinkToken();

      await db
        .update(instructorTable)
        .set({
          portalToken: hashedToken,
          portalTokenExpiry: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
          updatedAt: new Date(),
        })
        .where(eq(instructorTable.id, instructor.id));

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const magicLink = `${baseUrl}/instructor-signup?token=${token}&id=${instructor.id}`;

      // Send email (lazy import to avoid build issues if Resend is not configured)
      try {
        const { sendMagicLinkEmail } = await import("../lib/send-magic-link");
        const result = await sendMagicLinkEmail({
          organizationId: instructor.organizationId,
          locationId: instructor.locationId,
          instructorId: instructor.id,
          tokenDigest: hashedToken,
          to: instructor.email,
          instructorName: instructor.name,
          magicLink,
          expiresAt: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
          organizationName: instructor.location?.companyName || instructor.organization.name,
        });

        if (!result.success) {
          throw new TRPCError({
            code:
              result.status === "SUPPRESSED"
                ? "PRECONDITION_FAILED"
                : "INTERNAL_SERVER_ERROR",
            message: result.error,
          });
        }

        return {
          success: true,
          queued: true,
          deliveryId: result.deliveryId,
          message: "Magic link queued for delivery",
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to queue email",
          cause: error,
        });
      }
    }),

  // Verify magic link token (Portal side - public)
  verifyMagicLink: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        token: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const hashedToken = hashInstructorMagicLinkToken(input.token);

      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      if (
        !instructor.portalToken ||
        instructor.portalToken !== hashedToken ||
        !instructor.portalTokenExpiry ||
        instructor.portalTokenExpiry < new Date()
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired magic link",
        });
      }

      // Update last login
      await db
        .update(instructorTable)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(instructorTable.id, instructor.id));

      return {
        instructorId: instructor.id,
        name: instructor.name,
        locationId: instructor.locationId,
      };
    }),

  // Get instructor profile (Portal side - uses session)
  getProfile: baseProcedure
    .input(z.object({ instructorId: z.string() }))
    .query(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          employeeId: true,
          role: true,
          isActive: true,
          locationId: true,
        },
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      if (!instructor.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Instructor account is inactive",
        });
      }

      return instructor;
    }),

  // Get full instructor profile (Portal side)
  getFullProfile: baseProcedure
    .input(z.object({ instructorId: z.string() }))
    .query(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      if (!instructor.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Instructor account is inactive",
        });
      }

      return instructor;
    }),

  // Update instructor profile (Portal side)
  updateProfile: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.date().optional(),
        gender: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        county: z.string().optional(),
        postcode: z.string().optional(),
        country: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactRelation: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        emergencyContactEmail: z.string().email().optional(),
        hasOwnTransport: z.boolean().optional(),
        maxHoursPerWeek: z.number().optional(),
        travelRadius: z.number().optional(),
        skills: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { instructorId, ...updateData } = input;

      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      if (!instructor.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Instructor account is inactive",
        });
      }

      // Auto-update name if firstName/lastName provided
      const name =
        updateData.firstName && updateData.lastName
          ? `${updateData.firstName} ${updateData.lastName}`
          : instructor.name;

      const [updated] = await db
        .update(instructorTable)
        .set({
          ...updateData,
          name,
          updatedAt: new Date(),
        })
        .where(eq(instructorTable.id, instructorId))
        .returning();

      return updated;
    }),

  // Update instructor profile photo (Portal side)
  updateProfilePhoto: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        profilePhoto: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      if (!instructor.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Instructor account is inactive",
        });
      }

      const [updated] = await db
        .update(instructorTable)
        .set({
          profilePhoto: input.profilePhoto,
          updatedAt: new Date(),
        })
        .where(eq(instructorTable.id, input.instructorId))
        .returning();

      return updated;
    }),

  // Get instructor documents (Portal side)
  getDocuments: baseProcedure
    .input(z.object({ instructorId: z.string() }))
    .query(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const documents = await db.query.instructorDocument.findMany({
        where: eq(instructorDocumentTable.instructorId, input.instructorId),
        orderBy: desc(instructorDocumentTable.createdAt),
      });

      return documents;
    }),

  // Create instructor document (Portal side)
  createDocument: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        type: z.string(),
        name: z.string(),
        description: z.string().optional(),
        documentNumber: z.string().optional(),
        issueDate: z.date().optional(),
        expiryDate: z.date().optional(),
        issuingAuthority: z.string().optional(),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { instructorId, ...documentData } = input;

      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      // Determine status based on whether file is uploaded
      const status = documentData.fileUrl ? "PENDING_REVIEW" : "PENDING_UPLOAD";

      const [document] = await db
        .insert(instructorDocumentTable)
        .values({
          id: crypto.randomUUID(),
          instructorId,
          type: documentData.type as any,
          name: documentData.name,
          description: documentData.description,
          documentNumber: documentData.documentNumber,
          issueDate: documentData.issueDate,
          expiryDate: documentData.expiryDate,
          issuingAuthority: documentData.issuingAuthority,
          fileUrl: documentData.fileUrl,
          fileName: documentData.fileName,
          fileSize: documentData.fileSize,
          mimeType: documentData.mimeType,
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return document;
    }),

  // Upload file to existing document (Portal side)
  uploadDocumentFile: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        documentId: z.string(),
        fileUrl: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const document = await db.query.instructorDocument.findFirst({
        where: and(
          eq(instructorDocumentTable.id, input.documentId),
          eq(instructorDocumentTable.instructorId, input.instructorId),
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const [updated] = await db
        .update(instructorDocumentTable)
        .set({
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          status: "PENDING_REVIEW",
          updatedAt: new Date(),
        })
        .where(eq(instructorDocumentTable.id, input.documentId))
        .returning();

      return updated;
    }),

  // Delete instructor document (Portal side)
  deleteDocument: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        documentId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const document = await db.query.instructorDocument.findFirst({
        where: and(
          eq(instructorDocumentTable.id, input.documentId),
          eq(instructorDocumentTable.instructorId, input.instructorId),
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      await db.delete(instructorDocumentTable).where(eq(instructorDocumentTable.id, input.documentId));

      return { success: true };
    }),

  // Approve instructor document (Admin side)
  approveDocument: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
        documentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      // Verify instructor belongs to organization
      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.instructorId),
          eq(instructorTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(instructorTable.locationId, ctx.locationId)
            : isNull(instructorTable.locationId),
        ),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const document = await db.query.instructorDocument.findFirst({
        where: and(
          eq(instructorDocumentTable.id, input.documentId),
          eq(instructorDocumentTable.instructorId, input.instructorId),
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const [updated] = await db
        .update(instructorDocumentTable)
        .set({
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: ctx.auth.user.id,
          updatedAt: new Date(),
        })
        .where(eq(instructorDocumentTable.id, input.documentId))
        .returning();

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "instructor_document",
        entityId: updated!.id,
        entityName: updated!.name,
        metadata: {
          instructorId: input.instructorId,
          instructorName: instructor.name,
          documentType: updated!.type,
          action: "approved",
        },
        posthogProperties: {
          document_type: updated!.type,
          action: "approved",
        },
      });

      return updated;
    }),

  // Reject instructor document (Admin side)
  rejectDocument: protectedProcedure
    .input(
      z.object({
        instructorId: z.string(),
        documentId: z.string(),
        rejectionReason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      // Verify instructor belongs to organization
      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.instructorId),
          eq(instructorTable.organizationId, ctx.orgId),
          ctx.locationId
            ? eq(instructorTable.locationId, ctx.locationId)
            : isNull(instructorTable.locationId),
        ),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const document = await db.query.instructorDocument.findFirst({
        where: and(
          eq(instructorDocumentTable.id, input.documentId),
          eq(instructorDocumentTable.instructorId, input.instructorId),
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const [updated] = await db
        .update(instructorDocumentTable)
        .set({
          status: "REJECTED",
          rejectionReason: input.rejectionReason,
          reviewedAt: new Date(),
          reviewedBy: ctx.auth.user.id,
          updatedAt: new Date(),
        })
        .where(eq(instructorDocumentTable.id, input.documentId))
        .returning();

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "instructor_document",
        entityId: updated!.id,
        entityName: updated!.name,
        metadata: {
          instructorId: input.instructorId,
          instructorName: instructor.name,
          documentType: updated!.type,
          action: "rejected",
          rejectionReason: input.rejectionReason,
        },
        posthogProperties: {
          document_type: updated!.type,
          action: "rejected",
        },
      });

      return updated;
    }),

  // Get dashboard data (Portal side)
  getDashboard: baseProcedure
    .input(z.object({ instructorId: z.string() }))
    .query(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      // Get active time log
      const activeTimeLog = await db.query.timeLog.findFirst({
        where: and(
          eq(timeLogTable.instructorId, input.instructorId),
          isNull(timeLogTable.endTime),
        ),
      });

      // Get today's shifts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayShifts = await db.query.rota.findMany({
        where: and(
          eq(rotaTable.instructorId, input.instructorId),
          gte(rotaTable.startTime, today),
          lt(rotaTable.startTime, tomorrow),
        ),
        orderBy: asc(rotaTable.startTime),
      });

      // Get upcoming shifts (next 5)
      const upcomingShifts = await db.query.rota.findMany({
        where: and(
          eq(rotaTable.instructorId, input.instructorId),
          gte(rotaTable.startTime, new Date()),
        ),
        orderBy: asc(rotaTable.startTime),
        limit: 5,
      });

      // Get recent time logs (last 5)
      const recentTimeLogs = await db.query.timeLog.findMany({
        where: eq(timeLogTable.instructorId, input.instructorId),
        orderBy: desc(timeLogTable.startTime),
        limit: 5,
      });

      // Get pending documents
      const pendingDocuments = await db.query.instructorDocument.findMany({
        where: and(
          eq(instructorDocumentTable.instructorId, input.instructorId),
          eq(instructorDocumentTable.status, "PENDING_UPLOAD"),
        ),
      });

      // Get expiring documents (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringDocuments = await db.query.instructorDocument.findMany({
        where: and(
          eq(instructorDocumentTable.instructorId, input.instructorId),
          lte(instructorDocumentTable.expiryDate, thirtyDaysFromNow),
          gte(instructorDocumentTable.expiryDate, new Date()),
        ),
      });

      // Week stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekLogs = await db.query.timeLog.findMany({
        where: and(
          eq(timeLogTable.instructorId, input.instructorId),
          gte(timeLogTable.startTime, weekStart),
        ),
      });

      const totalMinutes = weekLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
      const earnings = weekLogs
        .filter((log) => log.status === "APPROVED" || log.status === "INVOICED")
        .reduce((acc, log) => acc + Number(log.totalAmount || 0), 0);

      const weekShifts = await db.query.rota.findMany({
        where: and(
          eq(rotaTable.instructorId, input.instructorId),
          gte(rotaTable.startTime, weekStart),
        ),
      });

      return {
        instructor,
        activeTimeLog,
        todayShifts,
        upcomingShifts,
        recentTimeLogs,
        pendingDocuments,
        expiringDocuments,
        weekStats: {
          totalMinutes,
          earnings,
          shiftsCount: weekShifts.length,
        },
      };
    }),

  // Get schedule (Portal side)
  getSchedule: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const shifts = await db.query.rota.findMany({
        where: and(
          eq(rotaTable.instructorId, input.instructorId),
          gte(rotaTable.startTime, input.startDate),
          lte(rotaTable.startTime, input.endDate),
        ),
        with: {
          client: {
            columns: {
              id: true,
              name: true,
              companyName: true,
            },
          },
        },
        orderBy: asc(rotaTable.startTime),
      });

      return { shifts };
    }),

  // Get time logs (Portal side)
  getTimeLogs: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const items = await db.query.timeLog.findMany({
        where: and(
          eq(timeLogTable.instructorId, input.instructorId),
          gte(timeLogTable.startTime, input.startDate),
          lte(timeLogTable.startTime, input.endDate),
        ),
        orderBy: desc(timeLogTable.startTime),
      });

      return { items };
    }),

  // Clock in (Portal side)
  clockIn: baseProcedure
    .input(z.object({ instructorId: z.string() }))
    .mutation(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      // Check if already clocked in
      const existing = await db.query.timeLog.findFirst({
        where: and(
          eq(timeLogTable.instructorId, input.instructorId),
          isNull(timeLogTable.endTime),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already clocked in",
        });
      }

      const [newTimeLog] = await db
        .insert(timeLogTable)
        .values({
          id: crypto.randomUUID(),
          organizationId: instructor.organizationId,
          locationId: instructor.locationId,
          instructorId: input.instructorId,
          startTime: new Date(),
          checkInMethod: "MANUAL",
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return newTimeLog;
    }),

  // Clock out (Portal side)
  clockOut: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        timeLogId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const instructor = await db.query.instructor.findFirst({
        where: eq(instructorTable.id, input.instructorId),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor not found",
        });
      }

      const timeLogEntry = await db.query.timeLog.findFirst({
        where: and(
          eq(timeLogTable.id, input.timeLogId),
          eq(timeLogTable.instructorId, input.instructorId),
        ),
      });

      if (!timeLogEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (timeLogEntry.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already clocked out",
        });
      }

      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - new Date(timeLogEntry.startTime).getTime()) / 1000 / 60,
      );

      const [updated] = await db
        .update(timeLogTable)
        .set({
          endTime,
          duration,
          status: "SUBMITTED",
          updatedAt: new Date(),
        })
        .where(eq(timeLogTable.id, timeLogEntry.id))
        .returning();

      return updated;
    }),

  // Get earnings data for instructor portal
  getEarnings: baseProcedure
    .input(
      z.object({
        instructorId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const { instructorId, startDate, endDate } = input;

      // Fetch all time logs for the period
      const timeLogs = await db.query.timeLog.findMany({
        where: and(
          eq(timeLogTable.instructorId, instructorId),
          gte(timeLogTable.startTime, startDate),
          lte(timeLogTable.startTime, endDate),
        ),
        with: {
          client: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: desc(timeLogTable.startTime),
      });

      // Fetch related invoices
      const invoiceIds = Array.from(
        new Set(timeLogs.map((entry) => entry.invoiceId).filter((id): id is string => Boolean(id))),
      );
      const invoices =
        invoiceIds.length > 0
          ? await db.query.invoice.findMany({
              where: inArray(invoiceTable.id, invoiceIds),
              columns: {
                id: true,
                invoiceNumber: true,
                status: true,
                total: true,
                amountPaid: true,
                issueDate: true,
                dueDate: true,
              },
              orderBy: desc(invoiceTable.issueDate),
            })
          : [];

      // Calculate statistics
      const stats = {
        totalMinutes: 0,
        approvedMinutes: 0,
        submittedMinutes: 0,
        draftMinutes: 0,
        overtimeMinutes: 0,
        totalEarnings: 0,
        approvedEarnings: 0,
        submittedEarnings: 0,
        draftEarnings: 0,
        pendingEarnings: 0,
        overtimeEarnings: 0,
        paidAmount: 0,
        pendingPaymentAmount: 0,
        notInvoicedAmount: 0,
        paidInvoicesCount: 0,
        pendingInvoicesCount: 0,
        notInvoicedLogsCount: 0,
      };

      for (const log of timeLogs) {
        const minutes = log.duration || 0;
        const amount = Number(log.totalAmount || 0);

        stats.totalMinutes += minutes;
        stats.totalEarnings += amount;

        if (log.status === "APPROVED") {
          stats.approvedMinutes += minutes;
          stats.approvedEarnings += amount;
        } else if (log.status === "SUBMITTED") {
          stats.submittedMinutes += minutes;
          stats.submittedEarnings += amount;
        } else if (log.status === "DRAFT") {
          stats.draftMinutes += minutes;
          stats.draftEarnings += amount;
        }

        if (log.isOvertime) {
          stats.overtimeMinutes += Number(log.overtimeHours || 0) * 60;
          // Calculate overtime earnings (could be time-and-a-half)
          const overtimeRate = Number(log.hourlyRate || 0) * 1.5;
          stats.overtimeEarnings += (Number(log.overtimeHours || 0) * overtimeRate);
        }

        if (!log.invoiceId) {
          stats.notInvoicedAmount += amount;
          stats.notInvoicedLogsCount += 1;
        }
      }

      // Calculate payment stats from invoices
      for (const invoice of invoices) {
        if (invoice.status === "PAID") {
          stats.paidAmount += Number(invoice.amountPaid);
          stats.paidInvoicesCount += 1;
        } else {
          stats.pendingPaymentAmount += Number(invoice.total) - Number(invoice.amountPaid);
          stats.pendingInvoicesCount += 1;
        }
      }

      stats.pendingEarnings = stats.submittedEarnings + stats.draftEarnings;

      return {
        stats,
        timeLogs,
        invoices,
      };
    }),

  getMyInstructorProfile: protectedProcedure.query(async ({ ctx }) => {
    const instructor = await db.query.instructor.findFirst({
      where: eq(instructorTable.userId, ctx.auth.user.id),
      with: {
        location: { columns: { id: true, companyName: true } },
        studioClasses: {
          where: and(
            gte(studioClassTable.startTime, new Date()),
            ne(studioClassTable.status, "CANCELLED")
          ),
          limit: 5,
          orderBy: asc(studioClassTable.startTime),
          with: {
            classType: { columns: { id: true, name: true, color: true } },
            room: { columns: { id: true, name: true } },
          },
        },
      },
    });

    if (!instructor) return null;

    return {
      ...instructor,
      instructedClasses: instructor.studioClasses,
    };
  }),

  completeSignup: baseProcedure
    .input(
      z.object({
        token: z.string(),
        instructorId: z.string(),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const hashedToken = hashInstructorMagicLinkToken(input.token);

      const instructor = await db.query.instructor.findFirst({
        where: and(
          eq(instructorTable.id, input.instructorId),
          eq(instructorTable.portalToken, hashedToken),
          gt(instructorTable.portalTokenExpiry, new Date())
        ),
      });

      if (!instructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired signup link",
        });
      }

      if (!instructor.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Instructor must have an email to create an account",
        });
      }

      const { auth } = await import("@/lib/auth");

      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, instructor.email),
      });

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const ctx = await auth.api.signUpEmail({
          body: {
            email: instructor.email,
            password: input.password,
            name: instructor.name,
          },
        });
        userId = ctx.user.id;
      }

      await db.transaction(async (tx) => {
        await tx
          .update(instructorTable)
          .set({
            userId,
            portalToken: null,
            portalTokenExpiry: null,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(instructorTable.id, instructor.id));

        if (instructor.organizationId) {
          const existingMembership = await tx.query.member.findFirst({
            where: and(
              eq(member.userId, userId),
              eq(member.organizationId, instructor.organizationId)
            ),
          });

          if (!existingMembership) {
            await tx.insert(member).values({
                id: crypto.randomUUID(),
                userId,
                organizationId: instructor.organizationId,
                role: "staff",
                createdAt: new Date(),
            });
          }
        }

        if (instructor.locationId) {
          const existingSubMembership = await tx.query.locationMember.findFirst({
            where: and(
              eq(locationMember.userId, userId),
              eq(locationMember.locationId, instructor.locationId)
            ),
          });

          if (!existingSubMembership) {
            await tx.insert(locationMember).values({
                id: crypto.randomUUID(),
                userId,
                locationId: instructor.locationId,
                role: "STANDARD",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
          }
        }
      });

      return { success: true, email: instructor.email };
    }),

  getMySchedule: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const instructor = await getCurrentInstructor(ctx.auth.user.id);

      if (!instructor) return {} as Record<string, never>;

      const classes = await db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.instructorId, instructor.id),
          gte(studioClassTable.startTime, new Date(input.startDate)),
          lte(studioClassTable.startTime, new Date(input.endDate)),
          ne(studioClassTable.status, "CANCELLED")
        ),
        orderBy: asc(studioClassTable.startTime),
        with: {
          classType: { columns: { id: true, name: true, color: true } },
          instructor: { columns: { id: true, name: true } },
          room: { columns: { id: true, name: true } },
          studioBookings: { columns: { id: true } },
        },
      });

      const classesWithCounts = classes.map(normalizeClassWithBookingCount);
      const schedule: Record<string, typeof classesWithCounts> = {};
      for (const cls of classesWithCounts) {
        const dateKey = cls.startTime.toISOString().split("T")[0];
        if (!schedule[dateKey]) schedule[dateKey] = [];
        schedule[dateKey].push(cls);
      }
      return schedule;
    }),

  listMyClasses: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["upcoming", "past", "all"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const instructor = await getCurrentInstructor(ctx.auth.user.id);

      if (!instructor) {
        return {
          classes: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            pageSize: input.pageSize,
            totalItems: 0,
          },
        };
      }

      const now = new Date();
      const conditions = [
        eq(studioClassTable.instructorId, instructor.id),
        ne(studioClassTable.status, "CANCELLED"),
      ];

      if (input.status === "upcoming") {
        conditions.push(gte(studioClassTable.startTime, now));
      } else if (input.status === "past") {
        conditions.push(lt(studioClassTable.startTime, now));
      }

      if (input.startDate || input.endDate) {
        if (input.startDate) {
          conditions.push(gte(studioClassTable.startTime, new Date(input.startDate)));
        }
        if (input.endDate) {
          conditions.push(lte(studioClassTable.startTime, new Date(input.endDate)));
        }
      }

      if (input.search) {
        conditions.push(ilike(studioClassTable.name, `%${input.search}%`));
      }

      const totalRows = await db
        .select({ total: count() })
        .from(studioClassTable)
        .where(and(...conditions));
      const totalItems = totalRows[0]?.total ?? 0;

      const classes = await db.query.studioClass.findMany({
        where: and(...conditions),
        orderBy:
          input.status === "past"
            ? desc(studioClassTable.startTime)
            : asc(studioClassTable.startTime),
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
        with: {
          classType: { columns: { id: true, name: true, color: true } },
          room: { columns: { id: true, name: true } },
          studioBookings: { columns: { id: true } },
        },
      });

      const totalPages = Math.ceil(totalItems / input.pageSize);

      return {
        classes: classes.map((cls) => ({
          ...normalizeClassWithBookingCount(cls),
          durationMinutes: Math.round(
            (cls.endTime.getTime() - cls.startTime.getTime()) / 60000
          ),
        })),
        pagination: {
          currentPage: input.page,
          totalPages,
          pageSize: input.pageSize,
          totalItems,
        },
      };
    }),

  getMyClasses: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.enum(["upcoming", "past", "all"]).default("upcoming"),
      })
    )
    .query(async ({ ctx, input }) => {
      const instructor = await getCurrentInstructor(ctx.auth.user.id);

      if (!instructor) return [];

      const now = new Date();
      const conditions = [
        eq(studioClassTable.instructorId, instructor.id),
        ne(studioClassTable.status, "CANCELLED"),
      ];

      if (input.status === "upcoming") {
        conditions.push(gte(studioClassTable.startTime, now));
      } else if (input.status === "past") {
        conditions.push(lt(studioClassTable.startTime, now));
      }

      if (input.startDate || input.endDate) {
        if (input.startDate) {
          conditions.push(gte(studioClassTable.startTime, input.startDate));
        }
        if (input.endDate) {
          conditions.push(lte(studioClassTable.startTime, input.endDate));
        }
      }

      const classes = await db.query.studioClass.findMany({
        where: and(...conditions),
        orderBy:
          input.status === "past"
            ? desc(studioClassTable.startTime)
            : asc(studioClassTable.startTime),
        limit: 50,
        with: {
          classType: { columns: { id: true, name: true, color: true } },
          room: { columns: { id: true, name: true } },
          studioBookings: { columns: { id: true } },
        },
      });

      return classes.map((cls) => ({
        ...normalizeClassWithBookingCount(cls),
        durationMinutes: Math.round(
          (cls.endTime.getTime() - cls.startTime.getTime()) / 60000,
        ),
      }));
    }),

  getMyEarnings: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const instructor = await getCurrentInstructor(ctx.auth.user.id);

      if (!instructor) {
        return {
          period: { startDate: new Date(), endDate: new Date() },
          hourlyRate: 0,
          currency: "GBP",
          totalMinutes: 0,
          totalHours: 0,
          totalEarned: 0,
          classCount: 0,
          allTimeClassCount: 0,
          classes: [],
        };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const startDate = input.startDate ?? startOfMonth;
      const endDate = input.endDate ?? endOfMonth;

      const completedClasses = await db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.instructorId, instructor.id),
          gte(studioClassTable.startTime, startDate),
          lte(studioClassTable.startTime, endDate),
          eq(studioClassTable.status, "COMPLETED")
        ),
        with: {
          classType: { columns: { name: true } },
        },
        orderBy: desc(studioClassTable.startTime),
      });

      const hourlyRate = instructor.hourlyRate
        ? Number(instructor.hourlyRate)
        : 0;

      let totalMinutes = 0;
      const classEarnings = completedClasses.map((cls) => {
        const durationMinutes = Math.max(
          1,
          Math.round((cls.endTime.getTime() - cls.startTime.getTime()) / 60000),
        );
        totalMinutes += durationMinutes;
        const hours = durationMinutes / 60;
        const earned = hours * hourlyRate;

        return {
          id: cls.id,
          className: cls.classType?.name ?? cls.name ?? "Class",
          date: cls.startTime,
          durationMinutes,
          earned,
        };
      });

      const totalHours = totalMinutes / 60;
      const totalEarned = totalHours * hourlyRate;

      const allTimeClassRows = await db
        .select({ total: count() })
        .from(studioClassTable)
        .where(
          and(
            eq(studioClassTable.instructorId, instructor.id),
            eq(studioClassTable.status, "COMPLETED")
          )
        );
      const allTimeClasses = allTimeClassRows[0]?.total ?? 0;

      return {
        period: { startDate, endDate },
        hourlyRate,
        currency: instructor.currency ?? "GBP",
        totalMinutes,
        totalHours,
        totalEarned,
        classCount: completedClasses.length,
        allTimeClassCount: allTimeClasses,
        classes: classEarnings,
      };
    }),

  getMyDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const instructor = await getCurrentInstructor(ctx.auth.user.id);

    if (!instructor) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      todayClasses,
      monthCompleted,
      monthAll,
      allTimeCompleted,
      upcomingClasses,
      monthBookings,
    ] = await Promise.all([
      db
        .select({ total: count() })
        .from(studioClassTable)
        .where(
          and(
            eq(studioClassTable.instructorId, instructor.id),
            gte(studioClassTable.startTime, todayStart),
            lt(studioClassTable.startTime, todayEnd),
            ne(studioClassTable.status, "CANCELLED")
          )
        ),
      db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.instructorId, instructor.id),
          gte(studioClassTable.startTime, monthStart),
          lte(studioClassTable.startTime, monthEnd),
          eq(studioClassTable.status, "COMPLETED")
        ),
      }),
      db
        .select({ total: count() })
        .from(studioClassTable)
        .where(
          and(
            eq(studioClassTable.instructorId, instructor.id),
            gte(studioClassTable.startTime, monthStart),
            lte(studioClassTable.startTime, monthEnd),
            ne(studioClassTable.status, "CANCELLED")
          )
        ),
      db
        .select({ total: count() })
        .from(studioClassTable)
        .where(
          and(
            eq(studioClassTable.instructorId, instructor.id),
            eq(studioClassTable.status, "COMPLETED")
          )
        ),
      db
        .select({ total: count() })
        .from(studioClassTable)
        .where(
          and(
            eq(studioClassTable.instructorId, instructor.id),
            gte(studioClassTable.startTime, now),
            ne(studioClassTable.status, "CANCELLED")
          )
        ),
      db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.instructorId, instructor.id),
          gte(studioClassTable.startTime, monthStart),
          lte(studioClassTable.startTime, monthEnd),
          ne(studioClassTable.status, "CANCELLED")
        ),
        with: { studioBookings: { columns: { id: true } } },
      }),
    ]);

    const hourlyRate = instructor.hourlyRate ? Number(instructor.hourlyRate) : 0;
    let totalMinutes = 0;
    for (const cls of monthCompleted) {
      totalMinutes += Math.max(
        1,
        Math.round((cls.endTime.getTime() - cls.startTime.getTime()) / 60000),
      );
    }
    const totalHours = totalMinutes / 60;
    const totalEarned = totalHours * hourlyRate;

    const totalBookings = monthBookings.reduce(
      (sum, cls) => sum + cls.studioBookings.length,
      0,
    );
    const avgBookings =
      monthBookings.length > 0
        ? Math.round((totalBookings / monthBookings.length) * 10) / 10
        : 0;

    return {
      classesToday: todayClasses[0]?.total ?? 0,
      hoursMonth: Math.round(totalHours * 10) / 10,
      earnedMonth: Math.round(totalEarned * 100) / 100,
      classesMonth: monthAll[0]?.total ?? 0,
      allTimeClasses: allTimeCompleted[0]?.total ?? 0,
      hourlyRate,
      avgBookings,
      upcomingClasses: upcomingClasses[0]?.total ?? 0,
      currency: instructor.currency ?? "GBP",
    };
  }),

  getMyClassesTrend: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const instructor = await getCurrentInstructor(ctx.auth.user.id);

      if (!instructor) return [];

      const now = new Date();
      const end = input?.endDate ?? now;
      const start = input?.startDate ?? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 30);

      const classes = await db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.instructorId, instructor.id),
          gte(studioClassTable.startTime, start),
          lte(studioClassTable.startTime, end),
          ne(studioClassTable.status, "CANCELLED")
        ),
        columns: { startTime: true },
        orderBy: asc(studioClassTable.startTime),
      });

      const buckets = buildWeeklyBuckets(start, end);
      for (const cls of classes) {
        const key = weekKey(cls.startTime);
        const bucket = buckets.get(key);
        if (bucket) bucket.value += 1;
      }

      return Array.from(buckets.values()).map((b) => ({
        label: b.label,
        count: b.value,
      }));
    }),

  getMyEarningsTrend: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const instructor = await getCurrentInstructor(ctx.auth.user.id);

      if (!instructor) return [];

      const hourlyRate = instructor.hourlyRate ? Number(instructor.hourlyRate) : 0;
      const now = new Date();
      const end = input?.endDate ?? now;
      const start = input?.startDate ?? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 30);

      const classes = await db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.instructorId, instructor.id),
          gte(studioClassTable.startTime, start),
          lte(studioClassTable.startTime, end),
          eq(studioClassTable.status, "COMPLETED")
        ),
        columns: { startTime: true, endTime: true },
        orderBy: asc(studioClassTable.startTime),
      });

      const buckets = buildWeeklyBuckets(start, end);
      for (const cls of classes) {
        const key = weekKey(cls.startTime);
        const bucket = buckets.get(key);
        if (bucket) {
          const mins = Math.max(1, Math.round((cls.endTime.getTime() - cls.startTime.getTime()) / 60000));
          bucket.value = Math.round((bucket.value + (mins / 60) * hourlyRate) * 100) / 100;
        }
      }

      return Array.from(buckets.values()).map((b) => ({
        label: b.label,
        amount: b.value,
      }));
    }),

  getMyBookingsTrend: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const instructor = await getCurrentInstructor(ctx.auth.user.id);

      if (!instructor) return [];

      const now = new Date();
      const end = input?.endDate ?? now;
      const start = input?.startDate ?? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 30);

      const classes = await db.query.studioClass.findMany({
        where: and(
          eq(studioClassTable.instructorId, instructor.id),
          gte(studioClassTable.startTime, start),
          lte(studioClassTable.startTime, end),
          ne(studioClassTable.status, "CANCELLED")
        ),
        columns: { startTime: true },
        with: { studioBookings: { columns: { id: true } } },
        orderBy: asc(studioClassTable.startTime),
      });

      const bucketData = buildWeeklyBuckets(start, end);
      const countMap = new Map<string, number>();
      for (const [key] of bucketData) countMap.set(key, 0);

      for (const cls of classes) {
        const key = weekKey(cls.startTime);
        const bucket = bucketData.get(key);
        if (bucket) {
          bucket.value += cls.studioBookings.length;
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
      }

      return Array.from(bucketData.entries()).map(([key, b]) => {
        const count = countMap.get(key) ?? 0;
        return {
          label: b.label,
          avg: count > 0 ? Math.round((b.value / count) * 10) / 10 : 0,
        };
      });
    }),

  getMyUpcomingClasses: protectedProcedure.query(async ({ ctx }) => {
    const instructor = await getCurrentInstructor(ctx.auth.user.id);

    if (!instructor) return [];

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const classes = await db.query.studioClass.findMany({
      where: and(
        eq(studioClassTable.instructorId, instructor.id),
        gte(studioClassTable.startTime, now),
        lte(studioClassTable.startTime, weekEnd),
        ne(studioClassTable.status, "CANCELLED")
      ),
      orderBy: asc(studioClassTable.startTime),
      limit: 15,
      with: {
        classType: { columns: { id: true, name: true, color: true } },
        room: { columns: { id: true, name: true } },
        studioBookings: { columns: { id: true } },
      },
    });
    return classes.map(normalizeClassWithBookingCount);
  }),
});

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekKey(d: Date): string {
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
}

function weekLabel(mondayStr: string): string {
  const [y, m, d] = mondayStr.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

function buildWeeklyBuckets(start: Date, end: Date): Map<string, { label: string; value: number }> {
  const buckets = new Map<string, { label: string; value: number }>();
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const endTime = end.getTime();
  while (cursor.getTime() <= endTime) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    buckets.set(key, { label: weekLabel(key), value: 0 });
    cursor.setDate(cursor.getDate() + 7);
  }
  return buckets;
}
