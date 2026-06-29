import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  classType,
  membershipPlan,
  pricingOption,
  pricingOptionAccessGrant,
  serviceCategory,
  serviceType,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const pricingOptionTypeSchema = z.enum([
  "CLASS_PACK",
  "MEMBERSHIP",
  "BUNDLE",
  "DROP_IN",
  "INTRO_OFFER",
  "ACCOUNT_CREDIT",
]);
const billingIntervalSchema = z.enum([
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
  "ONE_TIME",
]);
const accessTargetTypeSchema = z.enum([
  "ALL_SERVICES",
  "SERVICE_TYPE",
  "SERVICE_CATEGORY",
  "CLASS_TYPE",
  "VIDEO_LIBRARY",
  "COMMUNITY",
  "RETAIL_PRODUCT",
]);

const accessGrantInputSchema = z.object({
  targetType: accessTargetTypeSchema.default("ALL_SERVICES"),
  serviceTypeId: z.string().optional().nullable(),
  serviceCategoryId: z.string().optional().nullable(),
  classTypeId: z.string().optional().nullable(),
  targetKey: z.string().trim().max(120).optional().nullable(),
  visitLimit: z.number().int().positive().optional().nullable(),
  bookingLimitPerDay: z.number().int().positive().optional().nullable(),
  bookingLimitPerWeek: z.number().int().positive().optional().nullable(),
  bookingLimitPerMonth: z.number().int().positive().optional().nullable(),
});

const pricingOptionInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  type: pricingOptionTypeSchema.default("MEMBERSHIP"),
  price: z.number().min(0),
  currency: z.string().trim().length(3).default("GBP"),
  billingInterval: billingIntervalSchema.default("ONE_TIME"),
  classCredits: z.number().int().positive().optional().nullable(),
  durationDays: z.number().int().positive().optional().nullable(),
  revenueCategory: z.string().trim().max(120).optional().nullable(),
  isIntroOffer: z.boolean().default(false),
  isBundle: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  isHidden: z.boolean().default(false),
  showInPos: z.boolean().default(true),
  directPurchaseEnabled: z.boolean().default(true),
  termsText: z.string().trim().max(8000).optional().nullable(),
  confirmationEmailBody: z.string().trim().max(4000).optional().nullable(),
  confirmationRedirectUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  commissionMode: z.string().trim().max(40).default("NONE"),
  commissionValue: z.number().min(0).optional().nullable(),
  maxPurchases: z.number().int().positive().optional().nullable(),
  maxPurchasesPerClient: z.number().int().positive().optional().nullable(),
  accessSummary: z.string().trim().max(1000).optional().nullable(),
  accessGrants: z.array(accessGrantInputSchema).default([]),
});

type PricingOptionInput = z.infer<typeof pricingOptionInputSchema>;
type AccessGrantInput = z.infer<typeof accessGrantInputSchema>;

function requireOrg(ctx: { orgId: string | null }): string {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
  }
  return ctx.orgId;
}

function locationCondition(
  column: typeof pricingOption.locationId | typeof membershipPlan.locationId,
  locationId: string | null,
): SQL {
  return locationId ? eq(column, locationId) : isNull(column);
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "pricing-option";
}

async function uniqueSlug(organizationId: string, name: string): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query.pricingOption.findFirst({
      where: and(eq(pricingOption.organizationId, organizationId), eq(pricingOption.slug, slug)),
      columns: { id: true },
    });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function money(value: number | null | undefined): string | null {
  return value == null ? null : value.toFixed(2);
}

function typeFromMembershipPlanType(
  type: typeof membershipPlan.$inferSelect.type,
): z.infer<typeof pricingOptionTypeSchema> {
  if (type === "CLASS_PACK" || type === "DROP_IN" || type === "INTRO_OFFER") {
    return type;
  }
  return "MEMBERSHIP";
}

async function assertGrantReferences(
  organizationId: string,
  grant: AccessGrantInput,
): Promise<void> {
  if (grant.serviceTypeId) {
    const record = await db.query.serviceType.findFirst({
      where: and(eq(serviceType.id, grant.serviceTypeId), eq(serviceType.organizationId, organizationId)),
      columns: { id: true },
    });
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Service type not found" });
  }
  if (grant.serviceCategoryId) {
    const record = await db.query.serviceCategory.findFirst({
      where: and(eq(serviceCategory.id, grant.serviceCategoryId), eq(serviceCategory.organizationId, organizationId)),
      columns: { id: true },
    });
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Service category not found" });
  }
  if (grant.classTypeId) {
    const record = await db.query.classType.findFirst({
      where: and(eq(classType.id, grant.classTypeId), eq(classType.organizationId, organizationId)),
      columns: { id: true },
    });
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Class type not found" });
  }
}

function pricingOptionValues(
  input: PricingOptionInput,
  organizationId: string,
  locationId: string | null,
  slug: string,
) {
  const buyPagePath = input.directPurchaseEnabled ? `/pricing/${slug}` : null;

  return {
    organizationId,
    locationId,
    name: input.name,
    slug,
    description: input.description || null,
    type: input.type,
    price: input.price.toFixed(2),
    currency: input.currency.toUpperCase(),
    billingInterval: input.billingInterval,
    classCredits: input.classCredits ?? null,
    durationDays: input.durationDays ?? null,
    revenueCategory: input.revenueCategory || null,
    isIntroOffer: input.isIntroOffer,
    isBundle: input.isBundle,
    isPublic: input.isPublic,
    isHidden: input.isHidden,
    showInPos: input.showInPos,
    directPurchaseEnabled: input.directPurchaseEnabled,
    buyPagePath,
    termsText: input.termsText || null,
    confirmationEmailBody: input.confirmationEmailBody || null,
    confirmationRedirectUrl: input.confirmationRedirectUrl || null,
    commissionMode: input.commissionMode,
    commissionValue: money(input.commissionValue),
    maxPurchases: input.maxPurchases ?? null,
    maxPurchasesPerClient: input.maxPurchasesPerClient ?? null,
    accessSummary: input.accessSummary || null,
    updatedAt: new Date(),
  };
}

export const pricingOptionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          includeInactive: z.boolean().default(false),
          posOnly: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const conditions: SQL[] = [
        eq(pricingOption.organizationId, organizationId),
        locationCondition(pricingOption.locationId, ctx.locationId),
      ];

      if (!input?.includeInactive) conditions.push(eq(pricingOption.isActive, true));
      if (input?.posOnly) conditions.push(eq(pricingOption.showInPos, true));

      return db
        .select({
          id: pricingOption.id,
          name: pricingOption.name,
          slug: pricingOption.slug,
          description: pricingOption.description,
          type: pricingOption.type,
          price: pricingOption.price,
          currency: pricingOption.currency,
          billingInterval: pricingOption.billingInterval,
          classCredits: pricingOption.classCredits,
          durationDays: pricingOption.durationDays,
          revenueCategory: pricingOption.revenueCategory,
          isIntroOffer: pricingOption.isIntroOffer,
          isBundle: pricingOption.isBundle,
          isPublic: pricingOption.isPublic,
          isHidden: pricingOption.isHidden,
          showInPos: pricingOption.showInPos,
          directPurchaseEnabled: pricingOption.directPurchaseEnabled,
          buyPagePath: pricingOption.buyPagePath,
          accessSummary: pricingOption.accessSummary,
          isActive: pricingOption.isActive,
          membershipPlanId: pricingOption.membershipPlanId,
          accessGrantCount: count(pricingOptionAccessGrant.id),
        })
        .from(pricingOption)
        .leftJoin(
          pricingOptionAccessGrant,
          eq(pricingOptionAccessGrant.pricingOptionId, pricingOption.id),
        )
        .where(and(...conditions))
        .groupBy(pricingOption.id)
        .orderBy(asc(pricingOption.sortOrder), asc(pricingOption.name));
    }),

  create: protectedProcedure
    .input(pricingOptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      for (const grant of input.accessGrants) {
        await assertGrantReferences(organizationId, grant);
      }

      const slug = await uniqueSlug(organizationId, input.name);
      const now = new Date();

      const created = await db.transaction(async (tx) => {
        const [option] = await tx
          .insert(pricingOption)
          .values({
            id: createId(),
            ...pricingOptionValues(input, organizationId, ctx.locationId ?? null, slug),
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const grants = input.accessGrants.length
          ? input.accessGrants
          : [{ targetType: "ALL_SERVICES" as const }];

        await tx.insert(pricingOptionAccessGrant).values(
          grants.map((grant) => ({
            id: createId(),
            organizationId,
            locationId: ctx.locationId ?? null,
            pricingOptionId: option.id,
            targetType: grant.targetType,
            serviceTypeId: grant.serviceTypeId || null,
            serviceCategoryId: grant.serviceCategoryId || null,
            classTypeId: grant.classTypeId || null,
            targetKey: grant.targetKey || null,
            visitLimit: grant.visitLimit ?? input.classCredits ?? null,
            bookingLimitPerDay: grant.bookingLimitPerDay ?? null,
            bookingLimitPerWeek: grant.bookingLimitPerWeek ?? null,
            bookingLimitPerMonth: grant.bookingLimitPerMonth ?? null,
            createdAt: now,
            updatedAt: now,
          })),
        );

        return option;
      });

      return created;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const [updated] = await db
        .update(pricingOption)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(pricingOption.id, input.id), eq(pricingOption.organizationId, organizationId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Pricing option not found" });
      return updated;
    }),

  backfillFromMembershipPlans: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);
    const existing = await db
      .select({ membershipPlanId: pricingOption.membershipPlanId })
      .from(pricingOption)
      .where(eq(pricingOption.organizationId, organizationId));
    const linkedPlanIds = new Set(
      existing.map((item) => item.membershipPlanId).filter((id): id is string => Boolean(id)),
    );

    const plans = await db
      .select()
      .from(membershipPlan)
      .where(
        and(
          eq(membershipPlan.organizationId, organizationId),
          locationCondition(membershipPlan.locationId, ctx.locationId),
          eq(membershipPlan.isActive, true),
        ),
      )
      .orderBy(asc(membershipPlan.sortOrder));

    const missingPlans = plans.filter((plan) => !linkedPlanIds.has(plan.id));
    if (missingPlans.length === 0) return { created: 0 };

    await db.transaction(async (tx) => {
      for (const plan of missingPlans) {
        const allowedClassTypeIds = plan.allowedClassTypeIds ?? [];
        const slug = await uniqueSlug(organizationId, plan.name);
        const [option] = await tx
          .insert(pricingOption)
          .values({
            id: createId(),
            organizationId,
            locationId: plan.locationId,
            membershipPlanId: plan.id,
            name: plan.name,
            slug,
            description: plan.description,
            type: typeFromMembershipPlanType(plan.type),
            price: plan.price,
            currency: plan.currency,
            billingInterval: plan.billingInterval,
            classCredits: plan.classCredits,
            durationDays: plan.durationDays,
            isIntroOffer: plan.isIntroOffer,
            isPublic: plan.isPublic,
            isHidden: !plan.isPublic,
            showInPos: true,
            directPurchaseEnabled: plan.isPublic,
            buyPagePath: plan.isPublic ? `/pricing/${slug}` : null,
            accessSummary:
              allowedClassTypeIds.length > 0
                ? `${allowedClassTypeIds.length} class type rules`
                : "All services",
            sortOrder: plan.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const grants =
          allowedClassTypeIds.length > 0
            ? allowedClassTypeIds.map((classTypeId) => ({
                targetType: "CLASS_TYPE" as const,
                classTypeId,
              }))
            : [{ targetType: "ALL_SERVICES" as const, classTypeId: null }];

        await tx.insert(pricingOptionAccessGrant).values(
          grants.map((grant) => ({
            id: createId(),
            organizationId,
            locationId: plan.locationId,
            pricingOptionId: option.id,
            targetType: grant.targetType,
            classTypeId: grant.classTypeId,
            visitLimit: plan.classCredits,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        );
      }
    });

    return { created: missingPlans.length };
  }),
});
