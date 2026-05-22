import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { and, arrayOverlaps, count, desc, eq, inArray, isNotNull, isNull, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { db } from "@/db";
import { campaign as campaignTable, campaignRecipient, client } from "@/db/schema";
import { inngest } from "@/inngest/client";
import type { SegmentFilter } from "../types";
import type { CampaignSegmentType, ClientType, LifecycleStage } from "@/db/enums";
import type { JsonValue } from "@/db/json";
import { ActivityAction } from "@/db/enums";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { createNotification } from "@/lib/notifications";

const jsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonSchema), z.record(z.string(), jsonSchema)])
);

const emailContentSchema = z.object({
  subject: z.string(),
  preheader: z.string().optional(),
  sections: z.array(jsonSchema),
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

      const campaigns = await db.query.campaign.findMany({
        where: and(
          eq(campaignTable.organizationId, ctx.orgId!),
          ctx.locationId ? eq(campaignTable.locationId, ctx.locationId) : isNull(campaignTable.locationId),
          input?.status ? eq(campaignTable.status, input.status) : undefined
        ),
        with: {
          emailDomain: true,
          emailTemplate: {
            columns: { id: true, name: true },
          },
        },
        orderBy: [desc(campaignTable.createdAt)],
        limit: limit + 1,
        offset: input?.cursor ? Number(input.cursor) : 0,
      });

      let nextCursor: string | undefined;
      if (campaigns.length > limit) {
        campaigns.pop();
        nextCursor = String((input?.cursor ? Number(input.cursor) : 0) + limit);
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
      const selectedCampaign = await db.query.campaign.findFirst({
        where: campaignOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
        with: {
          emailDomain: true,
          emailTemplate: true,
          campaignRecipients: {
            limit: 100,
            with: {
              client: {
                columns: { id: true, name: true, email: true },
              },
            },
            orderBy: [desc(campaignRecipient.createdAt)],
          },
        },
      });

      if (!selectedCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      return selectedCampaign;
    }),

  // Get campaign stats
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const selectedCampaign = await db.query.campaign.findFirst({
        where: campaignOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
        columns: {
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

      if (!selectedCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      return {
        ...selectedCampaign,
        openRate: selectedCampaign.delivered > 0
          ? ((selectedCampaign.opened / selectedCampaign.delivered) * 100).toFixed(1)
          : "0.0",
        clickRate: selectedCampaign.opened > 0
          ? ((selectedCampaign.clicked / selectedCampaign.opened) * 100).toFixed(1)
          : "0.0",
        bounceRate: selectedCampaign.totalRecipients > 0
          ? ((selectedCampaign.bounced / selectedCampaign.totalRecipients) * 100).toFixed(1)
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
        segmentFilter: jsonSchema.optional(),
        resendTemplateId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [createdCampaign] = await db
        .insert(campaignTable)
        .values({
          id: createId(),
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? null,
          name: input.name,
          subject: input.subject,
          preheaderText: input.preheaderText,
          content: input.content,
          templateId: input.templateId,
          resendTemplateId: input.resendTemplateId,
          emailDomainId: input.emailDomainId,
          fromName: input.fromName,
          fromEmail: input.fromEmail,
          replyTo: input.replyTo,
          segmentType: input.segmentType,
          segmentFilter: input.segmentFilter,
          status: "DRAFT",
          updatedAt: new Date(),
        })
        .returning();

      if (!createdCampaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create campaign",
        });
      }

      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: createdCampaign.id,
        entityName: createdCampaign.name,
        action: ActivityAction.CREATED,
      });

      await createNotification({
        type: "CAMPAIGN_CREATED",
        title: "Campaign created",
        message: `${ctx.auth.user.name} created a campaign: ${createdCampaign.name}.`,
        actorId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: createdCampaign.id,
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
      });

      return createdCampaign;
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
        segmentFilter: jsonSchema.optional(),
        resendTemplateId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingCampaign = await getOwnedCampaign(input.id, ctx.orgId!, ctx.locationId ?? null);

      if (!existingCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (existingCampaign.status !== "DRAFT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only draft campaigns can be edited",
        });
      }

      const { id, ...updateData } = input;

      const changes = getChangedFields(existingCampaign, input);

      const [updatedCampaign] = await db
        .update(campaignTable)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(campaignTable.id, id))
        .returning();

      if (!updatedCampaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update campaign",
        });
      }

      if (Object.keys(changes ?? {}).length > 0) {
        await logAnalytics({
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? null,
          userId: ctx.auth.user.id,
          entityType: "campaign",
          entityId: updatedCampaign.id,
          entityName: updatedCampaign.name,
          action: ActivityAction.UPDATED,
          changes,
        });

        await createNotification({
          type: "CAMPAIGN_UPDATED",
          title: "Campaign updated",
          message: `${ctx.auth.user.name} updated campaign ${updatedCampaign.name}.`,
          actorId: ctx.auth.user.id,
          entityType: "campaign",
          entityId: updatedCampaign.id,
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? undefined,
        });
      }

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
      const selectedCampaign = await getOwnedCampaign(input.id, ctx.orgId!, ctx.locationId ?? null);

      if (!selectedCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (selectedCampaign.status !== "DRAFT") {
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

      const [updatedCampaign] = await db
        .update(campaignTable)
        .set({
          scheduledAt,
          status: "SCHEDULED",
          updatedAt: new Date(),
        })
        .where(eq(campaignTable.id, input.id))
        .returning();

      if (!updatedCampaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to schedule campaign",
        });
      }

      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: updatedCampaign.id,
        entityName: updatedCampaign.name,
        action: ActivityAction.STATUS_CHANGED,
        metadata: { status: "SCHEDULED" },
      });

      await createNotification({
        type: "CAMPAIGN_SCHEDULED",
        title: "Campaign scheduled",
        message: `${ctx.auth.user.name} scheduled campaign ${updatedCampaign.name}.`,
        actorId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: updatedCampaign.id,
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
      });

      return updatedCampaign;
    }),

  // Send a campaign immediately
  send: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const selectedCampaign = await db.query.campaign.findFirst({
        where: campaignOwnerWhere(input.id, ctx.orgId!, ctx.locationId ?? null),
        with: { emailDomain: true },
      });

      if (!selectedCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (!["DRAFT", "SCHEDULED"].includes(selectedCampaign.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This campaign cannot be sent",
        });
      }

      await db
        .update(campaignTable)
        .set({ status: "QUEUED", updatedAt: new Date() })
        .where(eq(campaignTable.id, input.id));

      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: selectedCampaign.id,
        entityName: selectedCampaign.name,
        action: ActivityAction.STATUS_CHANGED,
        metadata: { status: "QUEUED" },
      });

      await createNotification({
        type: "CAMPAIGN_SENT",
        title: "Campaign sending",
        message: `${ctx.auth.user.name} queued campaign ${selectedCampaign.name} for sending.`,
        actorId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: selectedCampaign.id,
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
      });

      // Trigger the Inngest function to send the campaign
      await inngest.send({
        name: "campaign/send",
        data: {
          campaignId: input.id,
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? null,
        },
      });

      return { success: true, message: "Campaign queued for sending" };
    }),

  // Cancel a scheduled campaign
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const selectedCampaign = await getOwnedCampaign(input.id, ctx.orgId!, ctx.locationId ?? null);

      if (!selectedCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (!["SCHEDULED", "QUEUED"].includes(selectedCampaign.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only scheduled or queued campaigns can be cancelled",
        });
      }

      const [updatedCampaign] = await db
        .update(campaignTable)
        .set({
          status: "CANCELLED",
          scheduledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(campaignTable.id, input.id))
        .returning();

      if (!updatedCampaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel campaign",
        });
      }

      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: updatedCampaign.id,
        entityName: updatedCampaign.name,
        action: ActivityAction.STATUS_CHANGED,
        metadata: { status: "CANCELLED" },
      });

      await createNotification({
        type: "CAMPAIGN_CANCELLED",
        title: "Campaign cancelled",
        message: `${ctx.auth.user.name} cancelled campaign ${updatedCampaign.name}.`,
        actorId: ctx.auth.user.id,
        entityType: "campaign",
        entityId: updatedCampaign.id,
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
      });

      return updatedCampaign;
    }),

  // Duplicate a campaign
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const selectedCampaign = await getOwnedCampaign(input.id, ctx.orgId!, ctx.locationId ?? null);

      if (!selectedCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      const [newCampaign] = await db
        .insert(campaignTable)
        .values({
          id: createId(),
          organizationId: selectedCampaign.organizationId,
          locationId: selectedCampaign.locationId,
          name: `${selectedCampaign.name} (Copy)`,
          subject: selectedCampaign.subject,
          preheaderText: selectedCampaign.preheaderText,
          content: selectedCampaign.content,
          templateId: selectedCampaign.templateId,
          emailDomainId: selectedCampaign.emailDomainId,
          fromName: selectedCampaign.fromName,
          fromEmail: selectedCampaign.fromEmail,
          replyTo: selectedCampaign.replyTo,
          segmentType: selectedCampaign.segmentType,
          segmentFilter: selectedCampaign.segmentFilter,
          status: "DRAFT",
          updatedAt: new Date(),
        })
        .returning();

      if (!newCampaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to duplicate campaign",
        });
      }

      return newCampaign;
    }),

  // Delete a campaign
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const selectedCampaign = await getOwnedCampaign(input.id, ctx.orgId!, ctx.locationId ?? null);

      if (!selectedCampaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (["SENDING", "QUEUED"].includes(selectedCampaign.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete a campaign that is currently sending",
        });
      }

      await db.delete(campaignTable).where(eq(campaignTable.id, input.id));

      return { success: true };
    }),

  // Get recipient count for preview
  getRecipientCount: protectedProcedure
    .input(
      z.object({
        segmentType: z.enum(["ALL", "BY_TYPE", "BY_TAGS", "BY_LIFECYCLE", "BY_COUNTRY", "CUSTOM"]),
        segmentFilter: jsonSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = buildClientWhereClause(
        ctx.orgId!,
        ctx.locationId ?? null,
        input.segmentType,
        input.segmentFilter as SegmentFilter | undefined
      );

      const [result] = await db.select({ value: count() }).from(client).where(where);

      return { count: result?.value ?? 0 };
    }),
});

// Helper function to build client where clause based on segment
function buildClientWhereClause(
  organizationId: string,
  locationId: string | null,
  segmentType: CampaignSegmentType,
  segmentFilter?: SegmentFilter
): SQL | undefined {
  const baseConditions = [
    eq(client.organizationId, organizationId),
    locationId ? eq(client.locationId, locationId) : isNull(client.locationId),
    isNotNull(client.email),
    eq(client.emailUnsubscribed, false),
  ];

  switch (segmentType) {
    case "ALL":
      return and(...baseConditions);

    case "BY_TYPE": {
      const types = (segmentFilter?.types ?? []) as ClientType[];
      return and(...baseConditions, types.length > 0 ? inArray(client.type, types) : undefined);
    }

    case "BY_TAGS": {
      const tags = segmentFilter?.tags ?? [];
      return and(...baseConditions, tags.length > 0 ? arrayOverlaps(client.tags, tags) : undefined);
    }

    case "BY_LIFECYCLE": {
      const lifecycleStages = (segmentFilter?.lifecycleStages ?? []) as LifecycleStage[];
      return and(
        ...baseConditions,
        lifecycleStages.length > 0 ? inArray(client.lifecycleStage, lifecycleStages) : undefined
      );
    }

    case "BY_COUNTRY": {
      const countries = segmentFilter?.countries ?? [];
      return and(...baseConditions, countries.length > 0 ? inArray(client.country, countries) : undefined);
    }

    case "CUSTOM":
      return and(...baseConditions);

    default:
      return and(...baseConditions);
  }
}

function campaignOwnerWhere(id: string, organizationId: string, locationId: string | null): SQL | undefined {
  return and(
    eq(campaignTable.id, id),
    eq(campaignTable.organizationId, organizationId),
    locationId ? eq(campaignTable.locationId, locationId) : isNull(campaignTable.locationId)
  );
}

async function getOwnedCampaign(id: string, organizationId: string, locationId: string | null) {
  return db.query.campaign.findFirst({
    where: campaignOwnerWhere(id, organizationId, locationId),
  });
}

export { buildClientWhereClause };
