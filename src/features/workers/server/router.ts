import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { addHours } from "date-fns";
import { z } from "zod";
import { ActivityAction } from "@prisma/client";
import prisma from "@/lib/db";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";

const MAGIC_LINK_EXPIRY_HOURS = 24;

// Helper function to hash magic link tokens
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Helper function to generate magic link token
function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const workersRouter = createTRPCRouter({
  // List workers (CRM side)
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
        subaccountId: z.string().optional(), // Override for "all-clients" view
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

      // Use input subaccountId if provided, otherwise use context subaccountId
      const subaccountId = input.subaccountId !== undefined
        ? (input.subaccountId || null)
        : ctx.subaccountId;

      const where: any = {
        organizationId: ctx.orgId,
        // Only filter by subaccount if not viewing all clients
        ...(input.includeAllClients
          ? {}
          : subaccountId
            ? { subaccountId }
            : { subaccountId: null }
        ),
      };

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search, mode: "insensitive" } },
          { employeeId: { contains: input.search, mode: "insensitive" } },
          { role: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input.roles && input.roles.length > 0) {
        where.role = { in: input.roles };
      }

      if (input.rateMin !== undefined || input.rateMax !== undefined) {
        where.hourlyRate = {};
        if (input.rateMin !== undefined) {
          where.hourlyRate.gte = input.rateMin;
        }
        if (input.rateMax !== undefined) {
          where.hourlyRate.lte = input.rateMax;
        }
      }

      if (input.createdAfter || input.createdBefore) {
        where.createdAt = {};
        if (input.createdAfter) {
          where.createdAt.gte = input.createdAfter;
        }
        if (input.createdBefore) {
          where.createdAt.lte = input.createdBefore;
        }
      }

      // Get total count for pagination
      const totalItems = await prisma.worker.count({ where });

      const workers = await prisma.worker.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              timeLog: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(totalItems / input.pageSize);

      return {
        items: workers,
        pagination: {
          currentPage: input.page,
          totalPages,
          pageSize: input.pageSize,
          totalItems,
        },
      };
    }),

  // Get single worker (CRM side)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const worker = await prisma.worker.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
        include: {
          timeLog: {
            take: 10,
            orderBy: { startTime: "desc" },
            include: {
              deal: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      return worker;
    }),

  // Create worker (CRM side)
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

      const worker = await prisma.worker.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          name: input.name,
          email: input.email,
          phone: input.phone,
          employeeId: input.employeeId,
          hourlyRate: input.hourlyRate,
          currency: input.currency,
          role: input.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "worker",
        entityId: worker.id,
        entityName: worker.name,
        metadata: {
          email: worker.email,
          role: worker.role,
          hourlyRate: worker.hourlyRate?.toString(),
        },
        posthogProperties: {
          has_email: !!worker.email,
          has_phone: !!worker.phone,
          has_hourly_rate: !!worker.hourlyRate,
          role: worker.role,
          currency: worker.currency,
        },
      });

      return worker;
    }),

  // Update worker (CRM side)
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const worker = await prisma.worker.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const { id, ...updateData } = input;

      const updated = await prisma.worker.update({
        where: { id },
        data: updateData,
      });

      // Log analytics - convert data for comparison
      const workerForComparison = { ...worker, hourlyRate: worker.hourlyRate ? Number(worker.hourlyRate) : null };
      const changes = getChangedFields(workerForComparison, updateData);
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "worker",
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

  // Delete worker (CRM side)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const worker = await prisma.worker.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      await prisma.worker.delete({
        where: { id: input.id },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "worker",
        entityId: worker.id,
        entityName: worker.name,
        metadata: {
          role: worker.role,
        },
        posthogProperties: {
          role: worker.role,
        },
      });

      return { success: true };
    }),

  // Generate magic link (CRM side)
  generateMagicLink: protectedProcedure
    .input(z.object({ workerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const worker = await prisma.worker.findFirst({
        where: {
          id: input.workerId,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      // Generate token and hash it
      const token = generateMagicLinkToken();
      const hashedToken = hashToken(token);

      // Store hashed token and expiry
      await prisma.worker.update({
        where: { id: worker.id },
        data: {
          portalToken: hashedToken,
          portalTokenExpiry: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
        },
      });

      // Generate magic link URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const magicLink = `${baseUrl}/portal/${worker.id}/auth?token=${token}`;

      return {
        magicLink,
        expiresAt: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
      };
    }),

  // Send magic link via email
  sendMagicLinkEmail: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const worker = await prisma.worker.findFirst({
        where: {
          id: input.workerId,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
          subaccount: {
            select: {
              companyName: true,
            },
          },
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Worker does not have an email address",
        });
      }

      // Generate magic link
      const token = generateMagicLinkToken();
      const hashedToken = hashToken(token);

      await prisma.worker.update({
        where: { id: worker.id },
        data: {
          portalToken: hashedToken,
          portalTokenExpiry: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
        },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const magicLink = `${baseUrl}/portal/${worker.id}/auth?token=${token}`;

      // Send email (lazy import to avoid build issues if Resend is not configured)
      try {
        const { sendMagicLinkEmail } = await import("../lib/send-magic-link");
        const result = await sendMagicLinkEmail({
          to: worker.email,
          workerName: worker.name,
          magicLink,
          expiresAt: addHours(new Date(), MAGIC_LINK_EXPIRY_HOURS),
          organizationName: worker.subaccount?.companyName || worker.organization.name,
        });

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send email. Please copy the link manually.",
          });
        }

        return {
          success: true,
          message: "Magic link sent successfully",
        };
      } catch (error: any) {
        console.error("Failed to send magic link email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to send email",
        });
      }
    }),

  // Verify magic link token (Portal side - public)
  verifyMagicLink: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
        token: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const hashedToken = hashToken(input.token);

      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (
        !worker.portalToken ||
        worker.portalToken !== hashedToken ||
        !worker.portalTokenExpiry ||
        worker.portalTokenExpiry < new Date()
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired magic link",
        });
      }

      // Update last login
      await prisma.worker.update({
        where: { id: worker.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      return {
        workerId: worker.id,
        name: worker.name,
        subaccountId: worker.subaccountId,
      };
    }),

  // Get worker profile (Portal side - uses session)
  getProfile: baseProcedure
    .input(z.object({ workerId: z.string() }))
    .query(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          employeeId: true,
          role: true,
          isActive: true,
          subaccountId: true,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker account is inactive",
        });
      }

      return worker;
    }),

  // Get full worker profile (Portal side)
  getFullProfile: baseProcedure
    .input(z.object({ workerId: z.string() }))
    .query(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker account is inactive",
        });
      }

      return worker;
    }),

  // Update worker profile (Portal side)
  updateProfile: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
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
      const { workerId, ...updateData } = input;

      const worker = await prisma.worker.findUnique({
        where: { id: workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker account is inactive",
        });
      }

      // Auto-update name if firstName/lastName provided
      const name =
        updateData.firstName && updateData.lastName
          ? `${updateData.firstName} ${updateData.lastName}`
          : worker.name;

      const updated = await prisma.worker.update({
        where: { id: workerId },
        data: {
          ...updateData,
          name,
        },
      });

      return updated;
    }),

  // Update worker profile photo (Portal side)
  updateProfilePhoto: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
        profilePhoto: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      if (!worker.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Worker account is inactive",
        });
      }

      const updated = await prisma.worker.update({
        where: { id: input.workerId },
        data: {
          profilePhoto: input.profilePhoto,
        },
      });

      return updated;
    }),

  // Get worker documents (Portal side)
  getDocuments: baseProcedure
    .input(z.object({ workerId: z.string() }))
    .query(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const documents = await prisma.workerDocument.findMany({
        where: { workerId: input.workerId },
        orderBy: { createdAt: "desc" },
      });

      return documents;
    }),

  // Create worker document (Portal side)
  createDocument: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
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
      const { workerId, ...documentData } = input;

      const worker = await prisma.worker.findUnique({
        where: { id: workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      // Determine status based on whether file is uploaded
      const status = documentData.fileUrl ? "PENDING_REVIEW" : "PENDING_UPLOAD";

      const document = await prisma.workerDocument.create({
        data: {
          id: crypto.randomUUID(),
          workerId,
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
        },
      });

      return document;
    }),

  // Upload file to existing document (Portal side)
  uploadDocumentFile: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
        documentId: z.string(),
        fileUrl: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const document = await prisma.workerDocument.findFirst({
        where: {
          id: input.documentId,
          workerId: input.workerId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const updated = await prisma.workerDocument.update({
        where: { id: input.documentId },
        data: {
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          status: "PENDING_REVIEW",
          updatedAt: new Date(),
        },
      });

      return updated;
    }),

  // Delete worker document (Portal side)
  deleteDocument: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
        documentId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const document = await prisma.workerDocument.findFirst({
        where: {
          id: input.documentId,
          workerId: input.workerId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      await prisma.workerDocument.delete({
        where: { id: input.documentId },
      });

      return { success: true };
    }),

  // Approve worker document (Admin side)
  approveDocument: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
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

      // Verify worker belongs to organization
      const worker = await prisma.worker.findFirst({
        where: {
          id: input.workerId,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const document = await prisma.workerDocument.findFirst({
        where: {
          id: input.documentId,
          workerId: input.workerId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const updated = await prisma.workerDocument.update({
        where: { id: input.documentId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: ctx.auth.user.id,
          updatedAt: new Date(),
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "worker_document",
        entityId: updated.id,
        entityName: updated.name,
        metadata: {
          workerId: input.workerId,
          workerName: worker.name,
          documentType: updated.type,
          action: "approved",
        },
        posthogProperties: {
          document_type: updated.type,
          action: "approved",
        },
      });

      return updated;
    }),

  // Reject worker document (Admin side)
  rejectDocument: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
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

      // Verify worker belongs to organization
      const worker = await prisma.worker.findFirst({
        where: {
          id: input.workerId,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const document = await prisma.workerDocument.findFirst({
        where: {
          id: input.documentId,
          workerId: input.workerId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const updated = await prisma.workerDocument.update({
        where: { id: input.documentId },
        data: {
          status: "REJECTED",
          rejectionReason: input.rejectionReason,
          reviewedAt: new Date(),
          reviewedBy: ctx.auth.user.id,
          updatedAt: new Date(),
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "worker_document",
        entityId: updated.id,
        entityName: updated.name,
        metadata: {
          workerId: input.workerId,
          workerName: worker.name,
          documentType: updated.type,
          action: "rejected",
          rejectionReason: input.rejectionReason,
        },
        posthogProperties: {
          document_type: updated.type,
          action: "rejected",
        },
      });

      return updated;
    }),

  // Get dashboard data (Portal side)
  getDashboard: baseProcedure
    .input(z.object({ workerId: z.string() }))
    .query(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      // Get active time log
      const activeTimeLog = await prisma.timeLog.findFirst({
        where: {
          workerId: input.workerId,
          endTime: null,
        },
      });

      // Get today's shifts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayShifts = await prisma.rota.findMany({
        where: {
          workerId: input.workerId,
          startTime: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: { startTime: "asc" },
      });

      // Get upcoming shifts (next 5)
      const upcomingShifts = await prisma.rota.findMany({
        where: {
          workerId: input.workerId,
          startTime: {
            gte: new Date(),
          },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      });

      // Get recent time logs (last 5)
      const recentTimeLogs = await prisma.timeLog.findMany({
        where: {
          workerId: input.workerId,
        },
        orderBy: { startTime: "desc" },
        take: 5,
      });

      // Get pending documents
      const pendingDocuments = await prisma.workerDocument.findMany({
        where: {
          workerId: input.workerId,
          status: "PENDING_UPLOAD",
        },
      });

      // Get expiring documents (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringDocuments = await prisma.workerDocument.findMany({
        where: {
          workerId: input.workerId,
          expiryDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
        },
      });

      // Week stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekLogs = await prisma.timeLog.findMany({
        where: {
          workerId: input.workerId,
          startTime: {
            gte: weekStart,
          },
        },
      });

      const totalMinutes = weekLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
      const earnings = weekLogs
        .filter((log) => log.status === "APPROVED" || log.status === "INVOICED")
        .reduce((acc, log) => acc + Number(log.totalAmount || 0), 0);

      const weekShifts = await prisma.rota.findMany({
        where: {
          workerId: input.workerId,
          startTime: {
            gte: weekStart,
          },
        },
      });

      return {
        worker,
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
        workerId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const shifts = await prisma.rota.findMany({
        where: {
          workerId: input.workerId,
          startTime: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
      });

      return { shifts };
    }),

  // Get time logs (Portal side)
  getTimeLogs: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const items = await prisma.timeLog.findMany({
        where: {
          workerId: input.workerId,
          startTime: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        orderBy: { startTime: "desc" },
      });

      return { items };
    }),

  // Clock in (Portal side)
  clockIn: baseProcedure
    .input(z.object({ workerId: z.string() }))
    .mutation(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      // Check if already clocked in
      const existing = await prisma.timeLog.findFirst({
        where: {
          workerId: input.workerId,
          endTime: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already clocked in",
        });
      }

      const timeLog = await prisma.timeLog.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: worker.organizationId,
          subaccountId: worker.subaccountId,
          workerId: input.workerId,
          startTime: new Date(),
          checkInMethod: "MANUAL",
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return timeLog;
    }),

  // Clock out (Portal side)
  clockOut: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
        timeLogId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const worker = await prisma.worker.findUnique({
        where: { id: input.workerId },
      });

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker not found",
        });
      }

      const timeLog = await prisma.timeLog.findFirst({
        where: {
          id: input.timeLogId,
          workerId: input.workerId,
        },
      });

      if (!timeLog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time log not found",
        });
      }

      if (timeLog.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already clocked out",
        });
      }

      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - new Date(timeLog.startTime).getTime()) / 1000 / 60,
      );

      const updated = await prisma.timeLog.update({
        where: { id: timeLog.id },
        data: {
          endTime,
          duration,
          status: "SUBMITTED",
        },
      });

      return updated;
    }),

  // Get earnings data for worker portal
  getEarnings: baseProcedure
    .input(
      z.object({
        workerId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const { workerId, startDate, endDate } = input;

      // Fetch all time logs for the period
      const timeLogs = await prisma.timeLog.findMany({
        where: {
          workerId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          startTime: "desc",
        },
      });

      // Fetch related invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          timeLog: {
            some: {
              workerId,
              startTime: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          amountPaid: true,
          issueDate: true,
          dueDate: true,
        },
        orderBy: {
          issueDate: "desc",
        },
      });

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
});
