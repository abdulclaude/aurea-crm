import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  classType,
  client,
  membershipPlan,
  node,
  organization,
  pricingOption,
  pricingOptionAccessGrant,
  serviceCategory,
  serviceType,
  studioMembership,
  workflows,
} from "@/db/schema";
import {
  listCanonicalRevenueCategories,
  resolveRevenueCategorySelection,
  type RevenueCategorySnapshot,
} from "@/features/commerce-settings/server/revenue-runtime-resolver";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  pricingOptionPurchasedTriggerConfigSchema,
  pricingOptionTriggerMatches,
} from "@/features/workflows/lib/studio-trigger-config";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import {
  getPublicationControlBySource,
  getPublishedPublicationChannel,
} from "@/features/publications/public/resolver";
import {
  getPublishedPricingSnapshot,
  publishedPricingSourceIsCurrent,
} from "@/features/publications/public/pricing-snapshot";
import { sanitizeRichText } from "@/features/funnel-builder/lib/published-funnel-sanitization";
import { isSupportedCurrency } from "@/features/studio/lib/launchpad-readiness";

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
  confirmationRedirectUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .nullable()
    .or(z.literal("")),
  commissionMode: z.string().trim().max(40).default("NONE"),
  commissionValue: z.number().min(0).optional().nullable(),
  maxPurchases: z.number().int().positive().optional().nullable(),
  maxPurchasesPerClient: z.number().int().positive().optional().nullable(),
  accessSummary: z.string().trim().max(1000).optional().nullable(),
  accessGrants: z.array(accessGrantInputSchema).default([]),
});

type PricingOptionInput = z.infer<typeof pricingOptionInputSchema>;
type AccessGrantInput = z.infer<typeof accessGrantInputSchema>;
type PricingOptionType = z.infer<typeof pricingOptionTypeSchema>;
type MembershipPlanType = typeof membershipPlan.$inferInsert.type;

function requireOrg(ctx: { orgId: string | null }): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
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

async function uniqueSlug(
  organizationId: string,
  name: string,
): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query.pricingOption.findFirst({
      where: and(
        eq(pricingOption.organizationId, organizationId),
        eq(pricingOption.slug, slug),
      ),
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

function membershipPlanTypeFromPricingType(
  type: PricingOptionType,
): MembershipPlanType | null {
  if (type === "ACCOUNT_CREDIT") return null;
  if (type === "CLASS_PACK" || type === "DROP_IN" || type === "INTRO_OFFER") {
    return type;
  }
  if (type === "BUNDLE") return "TIERED";
  return "UNLIMITED";
}

async function allowedClassTypeIdsFromGrants(
  organizationId: string,
  locationId: string | null,
  grants: AccessGrantInput[],
): Promise<string[]> {
  const classTypeIds = grants
    .map((grant) => grant.classTypeId)
    .filter((id): id is string => Boolean(id));
  const serviceTypeIds = grants
    .map((grant) => grant.serviceTypeId)
    .filter((id): id is string => Boolean(id));

  if (serviceTypeIds.length > 0) {
    const services = await db
      .select({ classTypeId: serviceType.classTypeId })
      .from(serviceType)
      .where(
        and(
          eq(serviceType.organizationId, organizationId),
          locationId
            ? eq(serviceType.locationId, locationId)
            : isNull(serviceType.locationId),
          inArray(serviceType.id, serviceTypeIds),
        ),
      );
    for (const service of services) {
      if (service.classTypeId) classTypeIds.push(service.classTypeId);
    }
  }

  return Array.from(new Set(classTypeIds));
}

async function assertGrantReferences(
  organizationId: string,
  locationId: string | null,
  grant: AccessGrantInput,
): Promise<void> {
  if (grant.serviceTypeId) {
    const record = await db.query.serviceType.findFirst({
      where: and(
        eq(serviceType.id, grant.serviceTypeId),
        eq(serviceType.organizationId, organizationId),
        locationId
          ? eq(serviceType.locationId, locationId)
          : isNull(serviceType.locationId),
      ),
      columns: { id: true },
    });
    if (!record)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Service type not found",
      });
  }
  if (grant.serviceCategoryId) {
    const record = await db.query.serviceCategory.findFirst({
      where: and(
        eq(serviceCategory.id, grant.serviceCategoryId),
        eq(serviceCategory.organizationId, organizationId),
        locationId
          ? eq(serviceCategory.locationId, locationId)
          : isNull(serviceCategory.locationId),
      ),
      columns: { id: true },
    });
    if (!record)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Service category not found",
      });
  }
  if (grant.classTypeId) {
    const record = await db.query.classType.findFirst({
      where: and(
        eq(classType.id, grant.classTypeId),
        eq(classType.organizationId, organizationId),
        locationId
          ? eq(classType.locationId, locationId)
          : isNull(classType.locationId),
      ),
      columns: { id: true },
    });
    if (!record)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Class type not found",
      });
  }
}

function pricingOptionValues(
  input: PricingOptionInput,
  organizationId: string,
  organizationSlug: string,
  locationId: string | null,
  slug: string,
  revenueCategory: RevenueCategorySnapshot | null,
) {
  const buyPagePath = input.directPurchaseEnabled
    ? `/pricing/${organizationSlug}/${slug}`
    : null;

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
    revenueCategory: revenueCategory?.id ?? null,
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
    metadata: revenueCategory
      ? { revenueCategorySnapshot: revenueCategory }
      : {},
    updatedAt: new Date(),
  };
}

export const pricingOptionsRouter = createTRPCRouter({
  getCreateDefaults: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);
    const [row] = await db
      .select({ currency: organization.currency })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    const currency = row?.currency?.trim().toUpperCase() ?? "";
    if (!isSupportedCurrency(currency)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Set a valid workspace currency before creating pricing.",
      });
    }
    return { currency };
  }),

  revenueCategories: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);
    await requireCapability({
      actor: {
        userId: ctx.auth.user.id,
        organizationId,
        locationId: ctx.locationId,
      },
      capability: "commerce.view",
    });
    const categories = await listCanonicalRevenueCategories({
      organizationId,
      locationId: ctx.locationId,
    });
    return categories
      .map((category) => category.name)
      .sort((a, b) => a.localeCompare(b));
  }),

  getBuyPage: baseProcedure
    .input(
      z.object({
        orgSlug: z.string().min(1),
        pricingSlug: z.string().min(1),
        publicationTargetSlug: z.string().min(1).max(120).optional(),
      }),
    )
    .query(async ({ input }) => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.slug, input.orgSlug),
        columns: {
          id: true,
          name: true,
          logo: true,
          brandColor: true,
          accentColor: true,
          businessEmail: true,
          businessPhone: true,
          website: true,
        },
      });

      if (!org)
        throw new TRPCError({ code: "NOT_FOUND", message: "Studio not found" });

      const [option] = await db
        .select({
          id: pricingOption.id,
          locationId: pricingOption.locationId,
          name: pricingOption.name,
          slug: pricingOption.slug,
          description: pricingOption.description,
          type: pricingOption.type,
          price: pricingOption.price,
          currency: pricingOption.currency,
          billingInterval: pricingOption.billingInterval,
          classCredits: pricingOption.classCredits,
          durationDays: pricingOption.durationDays,
          accessSummary: pricingOption.accessSummary,
          termsText: pricingOption.termsText,
          confirmationRedirectUrl: pricingOption.confirmationRedirectUrl,
          membershipPlanId: pricingOption.membershipPlanId,
          stripePriceId: membershipPlan.stripePriceId,
          updatedAt: pricingOption.updatedAt,
        })
        .from(pricingOption)
        .leftJoin(
          membershipPlan,
          eq(membershipPlan.id, pricingOption.membershipPlanId),
        )
        .where(
          and(
            eq(pricingOption.organizationId, org.id),
            eq(pricingOption.slug, input.pricingSlug),
            eq(pricingOption.isActive, true),
            eq(pricingOption.isPublic, true),
            input.publicationTargetSlug
              ? undefined
              : eq(pricingOption.directPurchaseEnabled, true),
          ),
        )
        .limit(1);

      if (!option)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing option not found",
        });

      const {
        locationId: _locationId,
        updatedAt: _updatedAt,
        ...currentPublicOption
      } = option;
      let publicOption = currentPublicOption;
      let publicationPolicy = {
        allowDirectPurchase: true,
        showTerms: true,
      };

      if (input.publicationTargetSlug) {
        const target = await getPublishedPublicationChannel({
          organizationSlug: input.orgSlug,
          targetSlug: input.publicationTargetSlug,
          kind: "PRICING",
          sourceId: option.id,
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This published offer is unavailable.",
          });
        }
        const published = getPublishedPricingSnapshot(target.snapshot);
        if (
          !published ||
          !publishedPricingSourceIsCurrent({
            snapshot: published,
            sourceId: option.id,
            sourceUpdatedAt: option.updatedAt,
          })
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This offer changed after publication. Republish it before sharing or selling it.",
          });
        }
        publicOption = {
          ...published.option,
          confirmationRedirectUrl: option.confirmationRedirectUrl,
          membershipPlanId: option.membershipPlanId,
          stripePriceId: option.stripePriceId,
        };
        publicationPolicy = {
          allowDirectPurchase: published.policy.allowDirectPurchase,
          showTerms: published.policy.showTerms,
        };
      } else {
        const managedTarget = await getPublicationControlBySource({
          organizationId: org.id,
          locationId: option.locationId,
          kind: "PRICING",
          sourceKey: `pricing:${option.id}`,
        });
        if (managedTarget) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Use the published offer URL for this pricing option.",
          });
        }
      }

      const { description, termsText, ...publicOptionFields } = publicOption;

      return {
        studio: org,
        pricingOption: {
          ...publicOptionFields,
          descriptionHtml: description ? sanitizeRichText(description) : null,
          termsHtml: termsText ? sanitizeRichText(termsText) : null,
        },
        publicationPolicy,
      };
    }),

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

      if (!input?.includeInactive)
        conditions.push(eq(pricingOption.isActive, true));
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
          stripePriceId: membershipPlan.stripePriceId,
          accessGrantCount: count(pricingOptionAccessGrant.id),
        })
        .from(pricingOption)
        .leftJoin(
          membershipPlan,
          eq(membershipPlan.id, pricingOption.membershipPlanId),
        )
        .leftJoin(
          pricingOptionAccessGrant,
          eq(pricingOptionAccessGrant.pricingOptionId, pricingOption.id),
        )
        .where(and(...conditions))
        .groupBy(pricingOption.id, membershipPlan.stripePriceId)
        .orderBy(asc(pricingOption.sortOrder), asc(pricingOption.name));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId: ctx.locationId,
        },
        capability: "commerce.view",
      });
      const [option] = await db
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
          termsText: pricingOption.termsText,
          confirmationEmailBody: pricingOption.confirmationEmailBody,
          confirmationRedirectUrl: pricingOption.confirmationRedirectUrl,
          maxPurchases: pricingOption.maxPurchases,
          maxPurchasesPerClient: pricingOption.maxPurchasesPerClient,
          isActive: pricingOption.isActive,
          membershipPlanId: pricingOption.membershipPlanId,
          stripePriceId: membershipPlan.stripePriceId,
          createdAt: pricingOption.createdAt,
          updatedAt: pricingOption.updatedAt,
        })
        .from(pricingOption)
        .leftJoin(
          membershipPlan,
          eq(membershipPlan.id, pricingOption.membershipPlanId),
        )
        .where(
          and(
            eq(pricingOption.id, input.id),
            eq(pricingOption.organizationId, organizationId),
            locationCondition(pricingOption.locationId, ctx.locationId),
          ),
        )
        .limit(1);
      if (!option) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing option not found",
        });
      }

      const [grants, subscribers, automationNodes] = await Promise.all([
        db
          .select({
            id: pricingOptionAccessGrant.id,
            targetType: pricingOptionAccessGrant.targetType,
            serviceTypeId: pricingOptionAccessGrant.serviceTypeId,
            serviceTypeName: serviceType.name,
            serviceCategoryId: pricingOptionAccessGrant.serviceCategoryId,
            serviceCategoryName: serviceCategory.name,
            classTypeId: pricingOptionAccessGrant.classTypeId,
            classTypeName: classType.name,
            targetKey: pricingOptionAccessGrant.targetKey,
            visitLimit: pricingOptionAccessGrant.visitLimit,
            bookingLimitPerDay: pricingOptionAccessGrant.bookingLimitPerDay,
            bookingLimitPerWeek: pricingOptionAccessGrant.bookingLimitPerWeek,
            bookingLimitPerMonth: pricingOptionAccessGrant.bookingLimitPerMonth,
          })
          .from(pricingOptionAccessGrant)
          .leftJoin(
            serviceType,
            eq(serviceType.id, pricingOptionAccessGrant.serviceTypeId),
          )
          .leftJoin(
            serviceCategory,
            eq(serviceCategory.id, pricingOptionAccessGrant.serviceCategoryId),
          )
          .leftJoin(
            classType,
            eq(classType.id, pricingOptionAccessGrant.classTypeId),
          )
          .where(
            and(
              eq(pricingOptionAccessGrant.pricingOptionId, option.id),
              eq(pricingOptionAccessGrant.organizationId, organizationId),
              ctx.locationId
                ? eq(pricingOptionAccessGrant.locationId, ctx.locationId)
                : isNull(pricingOptionAccessGrant.locationId),
            ),
          )
          .orderBy(asc(pricingOptionAccessGrant.createdAt)),
        option.membershipPlanId
          ? db
              .select({
                id: studioMembership.id,
                clientId: studioMembership.clientId,
                clientName: client.name,
                clientEmail: client.email,
                status: studioMembership.status,
                startDate: studioMembership.startDate,
                renewalDate: studioMembership.renewalDate,
                endDate: studioMembership.endDate,
              })
              .from(studioMembership)
              .innerJoin(client, eq(client.id, studioMembership.clientId))
              .where(
                and(
                  eq(studioMembership.planId, option.membershipPlanId),
                  eq(studioMembership.organizationId, organizationId),
                  ctx.locationId
                    ? eq(studioMembership.locationId, ctx.locationId)
                    : isNull(studioMembership.locationId),
                  eq(client.organizationId, organizationId),
                  ctx.locationId
                    ? eq(client.locationId, ctx.locationId)
                    : isNull(client.locationId),
                ),
              )
              .orderBy(asc(client.name))
          : Promise.resolve([]),
        db
          .select({
            workflowId: workflows.id,
            workflowName: workflows.name,
            description: workflows.description,
            archived: workflows.archived,
            nodeData: node.data,
          })
          .from(node)
          .innerJoin(workflows, eq(workflows.id, node.workflowId))
          .where(
            and(
              eq(node.type, NodeType.PRICING_OPTION_PURCHASED_TRIGGER),
              eq(workflows.userId, ctx.auth.user.id),
              eq(workflows.organizationId, organizationId),
              ctx.locationId
                ? eq(workflows.locationId, ctx.locationId)
                : isNull(workflows.locationId),
              eq(workflows.isTemplate, false),
            ),
          ),
      ]);
      const automations = automationNodes.filter((automation) => {
        const parsed = pricingOptionPurchasedTriggerConfigSchema.safeParse(
          automation.nodeData,
        );
        return (
          parsed.success &&
          pricingOptionTriggerMatches(parsed.data.pricingOptionIds, option.id)
        );
      });

      return { ...option, grants, subscribers, automations };
    }),

  create: protectedProcedure
    .input(pricingOptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId: ctx.locationId,
        },
        capability: "commerce.manage",
      });
      const revenueCategory = await resolveRevenueCategorySelection({
        scope: { organizationId, locationId: ctx.locationId },
        selection: input.revenueCategory,
      });
      const org = await db.query.organization.findFirst({
        where: eq(organization.id, organizationId),
        columns: { slug: true },
      });
      if (!org)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      for (const grant of input.accessGrants) {
        await assertGrantReferences(organizationId, ctx.locationId, grant);
      }

      const slug = await uniqueSlug(organizationId, input.name);
      const now = new Date();
      const grants = input.accessGrants.length
        ? input.accessGrants
        : [{ targetType: "ALL_SERVICES" as const }];
      const checkoutBackedType = membershipPlanTypeFromPricingType(input.type);
      const allowedClassTypeIds = await allowedClassTypeIdsFromGrants(
        organizationId,
        ctx.locationId,
        grants,
      );

      const created = await db.transaction(async (tx) => {
        const [checkoutPlan] = checkoutBackedType
          ? await tx
              .insert(membershipPlan)
              .values({
                id: createId(),
                name: input.name,
                description: input.description || null,
                type: checkoutBackedType,
                price: input.price.toFixed(2),
                currency: input.currency.toUpperCase(),
                billingInterval: input.billingInterval,
                classCredits: input.classCredits ?? null,
                durationDays: input.durationDays ?? null,
                allowedClassTypeIds,
                isIntroOffer:
                  input.type === "INTRO_OFFER" || input.isIntroOffer,
                isPublic: input.isPublic,
                sortOrder: input.showInPos ? 0 : 100,
                organizationId,
                locationId: ctx.locationId ?? null,
                createdAt: now,
                updatedAt: now,
              })
              .returning({ id: membershipPlan.id })
          : [null];

        const [option] = await tx
          .insert(pricingOption)
          .values({
            id: createId(),
            ...pricingOptionValues(
              input,
              organizationId,
              org.slug,
              ctx.locationId ?? null,
              slug,
              revenueCategory,
            ),
            membershipPlanId: checkoutPlan?.id ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

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
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId: ctx.locationId,
        },
        capability: "commerce.manage",
      });
      const updated = await db.transaction(async (tx) => {
        const [option] = await tx
          .update(pricingOption)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(pricingOption.id, input.id),
              eq(pricingOption.organizationId, organizationId),
              locationCondition(pricingOption.locationId, ctx.locationId),
            ),
          )
          .returning();
        if (option?.membershipPlanId) {
          await tx
            .update(membershipPlan)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(
                eq(membershipPlan.id, option.membershipPlanId),
                eq(membershipPlan.organizationId, organizationId),
                locationCondition(membershipPlan.locationId, ctx.locationId),
              ),
            );
        }
        return option;
      });

      if (!updated)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pricing option not found",
        });
      return updated;
    }),

  backfillFromMembershipPlans: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { slug: true },
    });
    if (!org)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    const existing = await db
      .select({ membershipPlanId: pricingOption.membershipPlanId })
      .from(pricingOption)
      .where(eq(pricingOption.organizationId, organizationId));
    const linkedPlanIds = new Set(
      existing
        .map((item) => item.membershipPlanId)
        .filter((id): id is string => Boolean(id)),
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
            buyPagePath: plan.isPublic ? `/pricing/${org.slug}/${slug}` : null,
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
