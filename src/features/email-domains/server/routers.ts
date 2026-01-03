import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

// Get the shared Resend client (uses system API key)
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Resend API key is not configured",
    });
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export const emailDomainsRouter = createTRPCRouter({
  // List all domains for the organization/subaccount
  list: protectedProcedure.query(async ({ ctx }) => {
    const domains = await prisma.emailDomain.findMany({
      where: {
        organizationId: ctx.orgId!,
        subaccountId: ctx.subaccountId ?? null,
      },
      orderBy: { createdAt: "desc" },
    });

    return domains;
  }),

  // Get a single domain by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const domain = await prisma.emailDomain.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      return domain;
    }),

  // Add a new domain
  create: protectedProcedure
    .input(
      z.object({
        domain: z.string().min(1, "Domain is required"),
        defaultFromName: z.string().optional(),
        defaultFromEmail: z.string().optional(),
        defaultReplyTo: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if domain already exists
      const existing = await prisma.emailDomain.findUnique({
        where: { domain: input.domain },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This domain is already registered",
        });
      }

      const resend = getResendClient();

      // Add domain to Resend
      const { data, error } = await resend.domains.create({
        name: input.domain,
      });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add domain to Resend: ${error.message}`,
        });
      }

      // Store domain with DNS records
      const domain = await prisma.emailDomain.create({
        data: {
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          domain: input.domain,
          resendDomainId: data?.id,
          status: "PENDING",
          dnsRecords: data?.records ? (data.records as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          defaultFromName: input.defaultFromName,
          defaultFromEmail: input.defaultFromEmail,
          defaultReplyTo: input.defaultReplyTo,
        },
      });

      return domain;
    }),

  // Verify domain DNS records
  verify: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await prisma.emailDomain.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      if (!domain.resendDomainId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Domain is not registered with Resend",
        });
      }

      const resend = getResendClient();

      // Trigger verification
      const { data, error } = await resend.domains.verify(domain.resendDomainId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to verify domain: ${error.message}`,
        });
      }

      // Update status
      await prisma.emailDomain.update({
        where: { id: input.id },
        data: {
          status: "VERIFYING",
          lastCheckedAt: new Date(),
        },
      });

      return { success: true };
    }),

  // Check verification status
  checkStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await prisma.emailDomain.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      if (!domain.resendDomainId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Domain is not registered with Resend",
        });
      }

      const resend = getResendClient();

      // Get domain status from Resend
      const { data, error } = await resend.domains.get(domain.resendDomainId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to check domain status: ${error.message}`,
        });
      }

      // Map Resend status to our status
      let status: "PENDING" | "VERIFYING" | "VERIFIED" | "FAILED" = "PENDING";
      if (data?.status === "verified") {
        status = "VERIFIED";
      } else if (data?.status === "pending") {
        status = "VERIFYING";
      } else if (data?.status === "failed") {
        status = "FAILED";
      }

      // Update our database
      const updatedDomain = await prisma.emailDomain.update({
        where: { id: input.id },
        data: {
          status,
          dnsRecords: (data?.records ?? domain.dnsRecords) as unknown as Prisma.InputJsonValue,
          lastCheckedAt: new Date(),
          verifiedAt: status === "VERIFIED" ? new Date() : null,
        },
      });

      return updatedDomain;
    }),

  // Update domain settings
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        defaultFromName: z.string().optional(),
        defaultFromEmail: z.string().optional(),
        defaultReplyTo: z.string().email().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await prisma.emailDomain.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      const updatedDomain = await prisma.emailDomain.update({
        where: { id: input.id },
        data: {
          defaultFromName: input.defaultFromName,
          defaultFromEmail: input.defaultFromEmail,
          defaultReplyTo: input.defaultReplyTo,
        },
      });

      return updatedDomain;
    }),

  // Delete a domain
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await prisma.emailDomain.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      // Check if domain is used by any campaigns
      const campaignsUsingDomain = await prisma.campaign.count({
        where: { emailDomainId: input.id },
      });

      if (campaignsUsingDomain > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `This domain is used by ${campaignsUsingDomain} campaign(s). Remove them first.`,
        });
      }

      // Delete from Resend if it exists
      if (domain.resendDomainId) {
        const resend = getResendClient();
        try {
          await resend.domains.remove(domain.resendDomainId);
        } catch {
          // Ignore errors - domain might already be deleted from Resend
        }
      }

      // Delete from our database
      await prisma.emailDomain.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
