import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import prisma from "@/lib/db";
import { inngest } from "@/inngest/client";
import type { SegmentFilter } from "../types";
import type { Prisma, ContactType, LifecycleStage } from "@prisma/client";

const emailContentSchema = z.object({
  subject: z.string(),
  preheader: z.string().optional(),
  sections: z.array(z.any()), // We'll validate structure more loosely for flexibility
});

const emailDesignSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  linkColor: z.string().optional(),
  logoUrl: z.string().optional(),
  fontFamily: z.string().optional(),
  footerText: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    youtube: z.string().optional(),
  }).optional(),
});

export const campaignsRouter = createTRPCRouter({
  // List all campaigns
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "SCHEDULED", "QUEUED", "SENDING", "SENT", "PAUSED", "FAILED", "CANCELLED"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      const campaigns = await prisma.campaign.findMany({
        where: {
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          ...(input?.status && { status: input.status }),
        },
        include: {
          emailDomain: true,
          template: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(input?.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (campaigns.length > limit) {
        const nextItem = campaigns.pop();
        nextCursor = nextItem?.id;
      }

      return {
        campaigns,
        nextCursor,
      };
    }),

  // Get a single campaign
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
        include: {
          emailDomain: true,
          template: true,
          recipients: {
            take: 100,
            include: {
              contact: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      return campaign;
    }),

  // Get campaign stats
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
        select: {
          id: true,
          totalRecipients: true,
          delivered: true,
          opened: true,
          clicked: true,
          bounced: true,
          complained: true,
          unsubscribed: true,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      return {
        ...campaign,
        openRate: campaign.delivered > 0
          ? ((campaign.opened / campaign.delivered) * 100).toFixed(1)
          : "0.0",
        clickRate: campaign.opened > 0
          ? ((campaign.clicked / campaign.opened) * 100).toFixed(1)
          : "0.0",
        bounceRate: campaign.totalRecipients > 0
          ? ((campaign.bounced / campaign.totalRecipients) * 100).toFixed(1)
          : "0.0",
      };
    }),

  // Create a new campaign
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        subject: z.string().min(1, "Subject is required"),
        preheaderText: z.string().optional(),
        content: emailContentSchema,
        design: emailDesignSchema.optional(),
        templateId: z.string().optional(),
        emailDomainId: z.string().optional(),
        fromName: z.string().optional(),
        fromEmail: z.string().optional(),
        replyTo: z.string().email().optional(),
        segmentType: z.enum(["ALL", "BY_TYPE", "BY_TAGS", "BY_LIFECYCLE", "BY_COUNTRY", "CUSTOM"]).default("ALL"),
        segmentFilter: z.any().optional(),
        resendTemplateId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.create({
        data: {
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          name: input.name,
          subject: input.subject,
          preheaderText: input.preheaderText,
          content: input.content as Prisma.InputJsonValue,
          templateId: input.templateId,
          resendTemplateId: input.resendTemplateId,
          emailDomainId: input.emailDomainId,
          fromName: input.fromName,
          fromEmail: input.fromEmail,
          replyTo: input.replyTo,
          segmentType: input.segmentType,
          segmentFilter: input.segmentFilter as Prisma.InputJsonValue,
          status: "DRAFT",
        },
      });

      return campaign;
    }),

  // Update a campaign
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        subject: z.string().min(1).optional(),
        preheaderText: z.string().optional(),
        content: emailContentSchema.optional(),
        design: emailDesignSchema.optional(),
        templateId: z.string().optional().nullable(),
        emailDomainId: z.string().optional().nullable(),
        fromName: z.string().optional(),
        fromEmail: z.string().optional(),
        replyTo: z.string().email().optional().nullable(),
        segmentType: z.enum(["ALL", "BY_TYPE", "BY_TAGS", "BY_LIFECYCLE", "BY_COUNTRY", "CUSTOM"]).optional(),
        segmentFilter: z.any().optional(),
        resendTemplateId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.status !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft campaigns can be edited",
        });
      }

      const { id, ...updateData } = input;

      const updatedCampaign = await prisma.campaign.update({
        where: { id },
        data: {
          ...updateData,
          content: updateData.content as Prisma.InputJsonValue,
          segmentFilter: updateData.segmentFilter as Prisma.InputJsonValue,
        },
      });

      return updatedCampaign;
    }),

  // Schedule a campaign
  schedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.status !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft campaigns can be scheduled",
        });
      }

      const scheduledAt = new Date(input.scheduledAt);
      if (scheduledAt <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Scheduled time must be in the future",
        });
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id: input.id },
        data: {
          scheduledAt,
          status: "SCHEDULED",
        },
      });

      return updatedCampaign;
    }),

  // Send a campaign immediately
  send: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
        include: {
          emailDomain: true,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This campaign cannot be sent",
        });
      }

      // Update status to QUEUED
      await prisma.campaign.update({
        where: { id: input.id },
        data: { status: "QUEUED" },
      });

      // Trigger the Inngest function to send the campaign
      await inngest.send({
        name: "campaign/send",
        data: {
          campaignId: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      return { success: true, message: "Campaign queued for sending" };
    }),

  // Cancel a scheduled campaign
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (!["SCHEDULED", "QUEUED"].includes(campaign.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only scheduled or queued campaigns can be cancelled",
        });
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id: input.id },
        data: {
          status: "CANCELLED",
          scheduledAt: null,
        },
      });

      return updatedCampaign;
    }),

  // Duplicate a campaign
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      const newCampaign = await prisma.campaign.create({
        data: {
          organizationId: campaign.organizationId,
          subaccountId: campaign.subaccountId,
          name: `${campaign.name} (Copy)`,
          subject: campaign.subject,
          preheaderText: campaign.preheaderText,
          content: campaign.content as Prisma.InputJsonValue,
          templateId: campaign.templateId,
          emailDomainId: campaign.emailDomainId,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          replyTo: campaign.replyTo,
          segmentType: campaign.segmentType,
          segmentFilter: campaign.segmentFilter as Prisma.InputJsonValue,
          status: "DRAFT",
        },
      });

      return newCampaign;
    }),

  // Delete a campaign
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (["SENDING", "QUEUED"].includes(campaign.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete a campaign that is currently sending",
        });
      }

      await prisma.campaign.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get recipient count for preview
  getRecipientCount: protectedProcedure
    .input(
      z.object({
        segmentType: z.enum(["ALL", "BY_TYPE", "BY_TAGS", "BY_LIFECYCLE", "BY_COUNTRY", "CUSTOM"]),
        segmentFilter: z.any().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = buildContactWhereClause(
        ctx.orgId!,
        ctx.subaccountId ?? null,
        input.segmentType,
        input.segmentFilter as SegmentFilter | undefined
      );

      const count = await prisma.contact.count({ where });

      return { count };
    }),
});

// Helper function to build contact where clause based on segment
function buildContactWhereClause(
  organizationId: string,
  subaccountId: string | null,
  segmentType: string,
  segmentFilter?: SegmentFilter
): Prisma.ContactWhereInput {
  const baseWhere: Prisma.ContactWhereInput = {
    organizationId,
    subaccountId,
    email: { not: null },
    emailUnsubscribed: false,
  };

  switch (segmentType) {
    case "ALL":
      return baseWhere;

    case "BY_TYPE":
      return {
        ...baseWhere,
        type: { in: (segmentFilter?.types || []) as ContactType[] },
      };

    case "BY_TAGS":
      return {
        ...baseWhere,
        tags: { hasSome: segmentFilter?.tags || [] },
      };

    case "BY_LIFECYCLE":
      return {
        ...baseWhere,
        lifecycleStage: { in: (segmentFilter?.lifecycleStages || []) as LifecycleStage[] },
      };

    case "BY_COUNTRY":
      return {
        ...baseWhere,
        country: { in: segmentFilter?.countries || [] },
      };

    case "CUSTOM":
      // Build custom filter - simplified for now
      return baseWhere;

    default:
      return baseWhere;
  }
}

export { buildContactWhereClause };
