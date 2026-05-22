import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { campaign, emailDomain } from "@/db/schema";

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
  // List all domains for the organization/location
  list: protectedProcedure.query(async ({ ctx }) => {
    const domains = await db.query.emailDomain.findMany({
      where: emailDomainScopeWhere(ctx.orgId!, ctx.locationId ?? null),
      orderBy: [desc(emailDomain.createdAt)],
    });

    return domains;
  }),

  // Get a single domain by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const domain = await db.query.emailDomain.findFirst({
        where: emailDomainOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
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
      const existing = await db.query.emailDomain.findFirst({
        where: eq(emailDomain.domain, input.domain),
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
      const [createdDomain] = await db
        .insert(emailDomain)
        .values({
          id: createId(),
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? null,
          domain: input.domain,
          resendDomainId: data?.id,
          status: "PENDING",
          dnsRecords: data?.records ?? null,
          defaultFromName: input.defaultFromName,
          defaultFromEmail: input.defaultFromEmail,
          defaultReplyTo: input.defaultReplyTo,
          updatedAt: new Date(),
        })
        .returning();

      if (!createdDomain) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save email domain",
        });
      }

      return createdDomain;
    }),

  // Verify domain DNS records
  verify: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await db.query.emailDomain.findFirst({
        where: emailDomainOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
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
      await db
        .update(emailDomain)
        .set({
          status: "VERIFYING",
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(emailDomain.id, input.id));

      return { success: true };
    }),

  // Check verification status
  checkStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await db.query.emailDomain.findFirst({
        where: emailDomainOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
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
      const [updatedDomain] = await db
        .update(emailDomain)
        .set({
          status,
          dnsRecords: data?.records ?? domain.dnsRecords,
          lastCheckedAt: new Date(),
          verifiedAt: status === "VERIFIED" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(emailDomain.id, input.id))
        .returning();

      if (!updatedDomain) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update domain status",
        });
      }

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
      const domain = await db.query.emailDomain.findFirst({
        where: emailDomainOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      const [updatedDomain] = await db
        .update(emailDomain)
        .set({
          defaultFromName: input.defaultFromName,
          defaultFromEmail: input.defaultFromEmail,
          defaultReplyTo: input.defaultReplyTo,
          updatedAt: new Date(),
        })
        .where(eq(emailDomain.id, input.id))
        .returning();

      if (!updatedDomain) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update domain",
        });
      }

      return updatedDomain;
    }),

  // Delete a domain
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await db.query.emailDomain.findFirst({
        where: emailDomainOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
      });

      if (!domain) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Domain not found",
        });
      }

      // Check if domain is used by any campaigns
      const [campaignCount] = await db
        .select({ value: count() })
        .from(campaign)
        .where(eq(campaign.emailDomainId, input.id));
      const campaignsUsingDomain = campaignCount?.value ?? 0;

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
      await db.delete(emailDomain).where(eq(emailDomain.id, input.id));

      return { success: true };
    }),
});

function emailDomainScopeWhere(organizationId: string, locationId: string | null): SQL | undefined {
  return and(
    eq(emailDomain.organizationId, organizationId),
    locationId ? eq(emailDomain.locationId, locationId) : isNull(emailDomain.locationId)
  );
}

function emailDomainOwnerWhere(id: string, organizationId: string, locationId: string | null): SQL | undefined {
  return and(eq(emailDomain.id, id), emailDomainScopeWhere(organizationId, locationId));
}
