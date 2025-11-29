import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { addHours } from "date-fns";
import { z } from "zod";
import prisma from "@/lib/db";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";

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
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        roles: z.array(z.string()).optional(),
        rateMin: z.number().optional(),
        rateMax: z.number().optional(),
        createdAfter: z.date().optional(),
        createdBefore: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization context",
        });
      }

      const where: any = {
        organizationId: ctx.orgId,
        // Strict scoping: only show workers created in the current context
        subaccountId: ctx.subaccountId ?? null,
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

      const workers = await prisma.worker.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              timeLogs: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (workers.length > input.limit) {
        const nextItem = workers.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: workers,
        nextCursor,
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
          timeLogs: {
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
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? null,
          name: input.name,
          email: input.email,
          phone: input.phone,
          employeeId: input.employeeId,
          hourlyRate: input.hourlyRate,
          currency: input.currency,
          role: input.role,
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
});
