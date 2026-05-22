import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";

import { db } from "@/db";
import {
  accessControlIntegration,
  dynamicPricingRule,
  externalChannelIntegration,
  marketplaceListing,
  performanceMetric,
  soapNote,
  studioPaymentPlan,
  videoOnDemandAsset,
  workoutProgram,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const externalChannelProviders = [
  "RESERVE_WITH_GOOGLE",
  "CLASSPASS",
  "GYMPASS",
  "WELLHUB",
] as const;
const externalChannelStatuses = [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "ERROR",
] as const;
const pricingAdjustmentTypes = ["PERCENT", "FIXED_AMOUNT"] as const;
const installmentProviders = [
  "INTERNAL",
  "STRIPE",
  "AFFIRM",
  "KLARNA",
  "CLEARPAY",
  "PAYPAL",
] as const;
const installmentIntervals = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
const contentAccessLevels = ["PUBLIC", "MEMBERS_ONLY", "PAID"] as const;
const accessControlProviders = [
  "KISI",
  "BRIVO",
  "SALTO",
  "HID",
  "GANTNER",
  "OTHER",
] as const;
const performanceMetricSources = ["MANUAL", "WEARABLE", "IMPORT"] as const;
const marketplaceStatuses = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "PAUSED",
  "REJECTED",
] as const;
const classDifficulties = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "ALL_LEVELS",
] as const;

function scopedConditions(ctx: { orgId: string | null; locationId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context is required",
    });
  }

  return {
    orgId: ctx.orgId,
    conditions: [
      eq(externalChannelIntegration.organizationId, ctx.orgId),
      ctx.locationId
        ? eq(externalChannelIntegration.locationId, ctx.locationId)
        : isNull(externalChannelIntegration.locationId),
    ],
  };
}

function tableScope<TOrganization extends { organizationId: AnyPgColumn; locationId: AnyPgColumn }>(
  table: TOrganization,
  orgId: string,
  locationId: string | null
) {
  return and(
    eq(table.organizationId, orgId),
    locationId ? eq(table.locationId, locationId) : isNull(table.locationId)
  );
}

export const studioAddOnsRouter = createTRPCRouter({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    const locationId = ctx.locationId;

    const [
      channels,
      pricingRules,
      paymentPlans,
      videos,
      accessIntegrations,
      performanceMetrics,
      workoutPrograms,
      soapNotes,
      marketplaceListings,
    ] = await Promise.all([
      db.select({ total: count() }).from(externalChannelIntegration).where(tableScope(externalChannelIntegration, orgId, locationId)),
      db.select({ total: count() }).from(dynamicPricingRule).where(tableScope(dynamicPricingRule, orgId, locationId)),
      db.select({ total: count() }).from(studioPaymentPlan).where(tableScope(studioPaymentPlan, orgId, locationId)),
      db.select({ total: count() }).from(videoOnDemandAsset).where(tableScope(videoOnDemandAsset, orgId, locationId)),
      db.select({ total: count() }).from(accessControlIntegration).where(tableScope(accessControlIntegration, orgId, locationId)),
      db.select({ total: count() }).from(performanceMetric).where(tableScope(performanceMetric, orgId, locationId)),
      db.select({ total: count() }).from(workoutProgram).where(tableScope(workoutProgram, orgId, locationId)),
      db.select({ total: count() }).from(soapNote).where(tableScope(soapNote, orgId, locationId)),
      db.select({ total: count() }).from(marketplaceListing).where(tableScope(marketplaceListing, orgId, locationId)),
    ]);

    return {
      channels: channels[0]?.total ?? 0,
      pricingRules: pricingRules[0]?.total ?? 0,
      paymentPlans: paymentPlans[0]?.total ?? 0,
      videos: videos[0]?.total ?? 0,
      accessIntegrations: accessIntegrations[0]?.total ?? 0,
      performanceMetrics: performanceMetrics[0]?.total ?? 0,
      workoutPrograms: workoutPrograms[0]?.total ?? 0,
      soapNotes: soapNotes[0]?.total ?? 0,
      marketplaceListings: marketplaceListings[0]?.total ?? 0,
    };
  }),

  listChannels: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    return db.query.externalChannelIntegration.findMany({
      where: tableScope(externalChannelIntegration, orgId, ctx.locationId),
      orderBy: desc(externalChannelIntegration.updatedAt),
      columns: {
        id: true,
        provider: true,
        status: true,
        accountName: true,
        bookingUrl: true,
        externalAccountId: true,
        lastSyncedAt: true,
        updatedAt: true,
      },
    });
  }),

  upsertChannel: protectedProcedure
    .input(
      z.object({
        provider: z.enum(externalChannelProviders),
        status: z.enum(externalChannelStatuses).default("DRAFT"),
        accountName: z.string().max(120).optional(),
        bookingUrl: z.string().url().optional().or(z.literal("")),
        externalAccountId: z.string().max(120).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const existing = await db.query.externalChannelIntegration.findFirst({
        where: and(
          tableScope(externalChannelIntegration, orgId, ctx.locationId),
          eq(externalChannelIntegration.provider, input.provider)
        ),
        columns: { id: true },
      });
      const values = {
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        provider: input.provider,
        status: input.status,
        accountName: input.accountName?.trim() || null,
        bookingUrl: input.bookingUrl?.trim() || null,
        externalAccountId: input.externalAccountId?.trim() || null,
        enabledAt: input.status === "ACTIVE" ? new Date() : null,
        updatedAt: new Date(),
      };

      if (!existing) {
        const [created] = await db
          .insert(externalChannelIntegration)
          .values({ id: crypto.randomUUID(), ...values })
          .returning();
        return created;
      }

      const [updated] = await db
        .update(externalChannelIntegration)
        .set(values)
        .where(eq(externalChannelIntegration.id, existing.id))
        .returning();
      return updated;
    }),

  createPricingRule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        classTypeId: z.string().optional(),
        adjustmentType: z.enum(pricingAdjustmentTypes),
        adjustmentValue: z.number(),
        demandThresholdPercent: z.number().int().min(0).max(100).optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const [created] = await db.insert(dynamicPricingRule).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        updatedAt: new Date(),
        name: input.name.trim(),
        classTypeId: input.classTypeId || null,
        adjustmentType: input.adjustmentType,
        adjustmentValue: input.adjustmentValue.toString(),
        demandThresholdPercent: input.demandThresholdPercent ?? null,
        daysOfWeek: input.daysOfWeek,
      }).returning();
      return created;
    }),

  listPricingRules: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    return db.query.dynamicPricingRule.findMany({
      where: tableScope(dynamicPricingRule, orgId, ctx.locationId),
      orderBy: desc(dynamicPricingRule.createdAt),
      with: { classType: { columns: { id: true, name: true } } },
    });
  }),

  createPaymentPlan: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        provider: z.enum(installmentProviders).default("INTERNAL"),
        membershipPlanId: z.string().optional(),
        depositAmount: z.number().nonnegative().optional(),
        installmentCount: z.number().int().min(2).max(60),
        interval: z.enum(installmentIntervals).default("MONTHLY"),
        feeAmount: z.number().nonnegative().optional(),
        feePercent: z.number().min(0).max(100).optional(),
        terms: z.string().max(1200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const [created] = await db.insert(studioPaymentPlan).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        updatedAt: new Date(),
        name: input.name.trim(),
        provider: input.provider,
        membershipPlanId: input.membershipPlanId || null,
        depositAmount: input.depositAmount?.toString() ?? null,
        installmentCount: input.installmentCount,
        interval: input.interval,
        feeAmount: input.feeAmount?.toString() ?? null,
        feePercent: input.feePercent?.toString() ?? null,
        terms: input.terms?.trim() || null,
      }).returning();
      return created;
    }),

  listPaymentPlans: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    return db.query.studioPaymentPlan.findMany({
      where: tableScope(studioPaymentPlan, orgId, ctx.locationId),
      orderBy: desc(studioPaymentPlan.createdAt),
      with: {
        membershipPlan: { columns: { id: true, name: true, price: true } },
      },
    });
  }),

  createVideo: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(160),
        videoUrl: z.string().url(),
        description: z.string().max(1200).optional(),
        classTypeId: z.string().optional(),
        instructorId: z.string().optional(),
        accessLevel: z.enum(contentAccessLevels).default("MEMBERS_ONLY"),
        price: z.number().nonnegative().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const [created] = await db.insert(videoOnDemandAsset).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        updatedAt: new Date(),
        title: input.title.trim(),
        videoUrl: input.videoUrl,
        description: input.description?.trim() || null,
        classTypeId: input.classTypeId || null,
        instructorId: input.instructorId || null,
        accessLevel: input.accessLevel,
        price: input.price?.toString() ?? null,
      }).returning();
      return created;
    }),

  listVideos: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    return db.query.videoOnDemandAsset.findMany({
      where: tableScope(videoOnDemandAsset, orgId, ctx.locationId),
      orderBy: desc(videoOnDemandAsset.createdAt),
      with: {
        classType: { columns: { id: true, name: true } },
        instructor: { columns: { id: true, name: true } },
      },
    });
  }),

  createAccessIntegration: protectedProcedure
    .input(
      z.object({
        provider: z.enum(accessControlProviders),
        locationName: z.string().max(120).optional(),
        status: z.enum(externalChannelStatuses).default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const [created] = await db.insert(accessControlIntegration).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        updatedAt: new Date(),
        provider: input.provider,
        locationName: input.locationName?.trim() || null,
        status: input.status,
      }).returning();
      return created;
    }),

  listAccessIntegrations: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    return db.query.accessControlIntegration.findMany({
      where: tableScope(accessControlIntegration, orgId, ctx.locationId),
      orderBy: desc(accessControlIntegration.createdAt),
    });
  }),

  createPerformanceMetric: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        metricType: z.string().min(1).max(80),
        value: z.number(),
        unit: z.string().min(1).max(40),
        source: z.enum(performanceMetricSources).default("MANUAL"),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const [created] = await db.insert(performanceMetric).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        clientId: input.clientId,
        metricType: input.metricType.trim(),
        value: input.value.toString(),
        unit: input.unit.trim(),
        source: input.source,
        notes: input.notes?.trim() || null,
      }).returning();
      return created;
    }),

  listPerformanceMetrics: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    return db.query.performanceMetric.findMany({
      where: tableScope(performanceMetric, orgId, ctx.locationId),
      orderBy: desc(performanceMetric.recordedAt),
      limit: 50,
      with: { client: { columns: { id: true, name: true } } },
    });
  }),

  createWorkoutProgram: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(160),
        description: z.string().max(1200).optional(),
        classTypeId: z.string().optional(),
        coachId: z.string().optional(),
        difficulty: z.enum(classDifficulties).optional(),
        blocks: z.string().min(1).max(8000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const [created] = await db.insert(workoutProgram).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        updatedAt: new Date(),
        title: input.title.trim(),
        description: input.description?.trim() || null,
        classTypeId: input.classTypeId || null,
        coachId: input.coachId || null,
        difficulty: input.difficulty ?? null,
        blocks: { text: input.blocks },
      }).returning();
      return created;
    }),

  listWorkoutPrograms: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    const programs = await db.query.workoutProgram.findMany({
      where: tableScope(workoutProgram, orgId, ctx.locationId),
      orderBy: desc(workoutProgram.createdAt),
      with: {
        classType: { columns: { id: true, name: true } },
        instructor: { columns: { id: true, name: true } },
      },
    });

    return programs.map((program) => ({
      ...program,
      coach: program.instructor,
    }));
  }),

  createSoapNote: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        authorId: z.string().optional(),
        subjective: z.string().min(1).max(4000),
        objective: z.string().max(4000).optional(),
        assessment: z.string().max(4000).optional(),
        plan: z.string().max(4000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const [created] = await db.insert(soapNote).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        updatedAt: new Date(),
        clientId: input.clientId,
        authorId: input.authorId || null,
        subjective: input.subjective.trim(),
        objective: input.objective?.trim() || null,
        assessment: input.assessment?.trim() || null,
        plan: input.plan?.trim() || null,
      }).returning();
      return created;
    }),

  listSoapNotes: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    const notes = await db.query.soapNote.findMany({
      where: tableScope(soapNote, orgId, ctx.locationId),
      orderBy: desc(soapNote.createdAt),
      limit: 50,
      with: {
        client: { columns: { id: true, name: true } },
        instructor: { columns: { id: true, name: true } },
      },
    });

    return notes.map((note) => ({
      ...note,
      author: note.instructor,
    }));
  }),

  upsertMarketplaceListing: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(160),
        description: z.string().min(1).max(2000),
        categories: z.array(z.string().max(60)).default([]),
        bookingUrl: z.string().url().optional().or(z.literal("")),
        status: z.enum(marketplaceStatuses).default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = scopedConditions(ctx);
      const data = {
        organizationId: orgId,
        locationId: ctx.locationId ?? null,
        title: input.title.trim(),
        description: input.description.trim(),
        categories: input.categories.map((category) => category.trim()).filter(Boolean),
        bookingUrl: input.bookingUrl?.trim() || null,
        status: input.status,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
        updatedAt: new Date(),
      };

      if (!input.id) {
        const [created] = await db.insert(marketplaceListing).values({
          id: crypto.randomUUID(),
          ...data,
        }).returning();
        return created;
      }

      const [updated] = await db
        .update(marketplaceListing)
        .set(data)
        .where(eq(marketplaceListing.id, input.id))
        .returning();
      return updated;
    }),

  listMarketplaceListings: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = scopedConditions(ctx);
    return db.query.marketplaceListing.findMany({
      where: tableScope(marketplaceListing, orgId, ctx.locationId),
      orderBy: desc(marketplaceListing.updatedAt),
    });
  }),
});
