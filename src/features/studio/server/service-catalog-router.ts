import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  classType as classTypeTable,
  classSeries,
  pricingOptionAccessGrant,
  serviceCategory,
  serviceType,
  studioClass,
} from "@/db/schema";
import { ActivityAction, ActivityType } from "@/db/enums";
import {
  getChangedFields,
  logActivity,
} from "@/features/activity/lib/log-activity";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  resolveRevenueCategorySelection,
  type RevenueCategorySnapshot,
} from "@/features/commerce-settings/server/revenue-runtime-resolver";
import {
  regionalCurrencySchema,
  resolveRegionalCurrency,
} from "@/lib/regional-context/contracts";
import { getRegionalContext } from "@/lib/regional-context/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const serviceExperienceTypeSchema = z.enum(["CLASS", "PRIVATE", "EVENT"]);
const serviceFormatSchema = z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]);
const servicePaymentTypeSchema = z.enum([
  "FREE",
  "PAID",
  "SLIDING_SCALE",
  "PACKAGE_ONLY",
]);
const serviceVisibilitySchema = z.enum(["PUBLIC", "PRIVATE"]);

const optionalMoneySchema = z.number().min(0).optional().nullable();
const optionalPositiveIntSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .nullable();
const optionalNonNegativeIntSchema = z
  .number()
  .int()
  .min(0)
  .optional()
  .nullable();

const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

const serviceTypeInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional().nullable(),
    categoryId: z.string().optional().nullable(),
    classTypeId: z.string().optional().nullable(),
    experienceType: serviceExperienceTypeSchema.default("CLASS"),
    format: serviceFormatSchema.default("IN_PERSON"),
    defaultLocation: z.string().trim().max(200).optional().nullable(),
    durationMinutes: z.number().int().positive().max(1440).default(60),
    capacity: optionalPositiveIntSchema,
    bufferMinutes: z.number().int().min(0).max(240).default(0),
    roomIds: z.array(z.string()).default([]),
    instructorIds: z.array(z.string()).default([]),
    paymentType: servicePaymentTypeSchema.default("PACKAGE_ONLY"),
    visibility: serviceVisibilitySchema.default("PUBLIC"),
    price: optionalMoneySchema,
    slidingScaleMinPrice: optionalMoneySchema,
    slidingScaleMaxPrice: optionalMoneySchema,
    currency: regionalCurrencySchema.optional(),
    revenueCategory: z.string().trim().max(120).optional().nullable(),
    bookingRestrictionTags: z
      .array(z.string().trim().min(1).max(80))
      .default([]),
    workoutTypes: z.array(z.string().trim().min(1).max(80)).default([]),
    areasOfFocus: z.array(z.string().trim().min(1).max(80)).default([]),
    intensity: z.string().trim().max(80).optional().nullable(),
    equipment: z.array(z.string().trim().min(1).max(80)).default([]),
    checkoutConfirmation: z.string().trim().max(2000).optional().nullable(),
    confirmationEmailBody: z.string().trim().max(4000).optional().nullable(),
    imageUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
    allowUnpaidBookings: z.boolean().default(false),
    delaySchedulingHours: optionalNonNegativeIntSchema,
    allowRecurringBookings: z.boolean().default(false),
    displayImageAtCheckout: z.boolean().default(true),
    calendarColor: z.string().trim().max(20).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.paymentType === "PAID" && value.price == null) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Price is required for paid services",
      });
    }

    if (value.paymentType === "SLIDING_SCALE") {
      if (
        value.slidingScaleMinPrice == null ||
        value.slidingScaleMaxPrice == null
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["slidingScaleMinPrice"],
          message: "Sliding scale services need a minimum and maximum price",
        });
        return;
      }

      if (value.slidingScaleMinPrice > value.slidingScaleMaxPrice) {
        ctx.addIssue({
          code: "custom",
          path: ["slidingScaleMaxPrice"],
          message: "Maximum price must be greater than minimum price",
        });
      }
    }
  });

type ServiceTypeInput = z.infer<typeof serviceTypeInputSchema>;
type ResolvedServiceTypeInput = ServiceTypeInput & { currency: string };
const serviceTypeUpdateInputSchema = serviceTypeInputSchema.safeExtend({
  id: z.string().min(1),
});

function requireOrg(ctx: { orgId: string | null }): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }

  return ctx.orgId;
}

async function requireServiceCatalogAccess(
  ctx: {
    auth: { user: { id: string } };
    orgId: string | null;
    locationId: string | null;
  },
  capability: "schedule.view" | "schedule.manage",
): Promise<string> {
  const organizationId = requireOrg(ctx);
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId,
      locationId: ctx.locationId,
    },
    capability,
    resource: { organizationId, locationId: ctx.locationId },
  });
  return organizationId;
}

function exactServiceScope(
  organizationId: string,
  locationId: string | null,
): SQL[] {
  return [
    eq(serviceType.organizationId, organizationId),
    locationScoped(serviceType.locationId, locationId),
  ].filter((condition): condition is SQL => condition !== undefined);
}

async function recordServiceActivity(input: {
  organizationId: string;
  locationId: string | null;
  userId: string;
  action: (typeof ActivityAction)[keyof typeof ActivityAction];
  service: { id: string; name: string };
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logActivity({
    organizationId: input.organizationId,
    locationId: input.locationId,
    userId: input.userId,
    type: ActivityType.BOOKING,
    action: input.action,
    entityType: "service_type",
    entityId: input.service.id,
    entityName: input.service.name,
    changes: input.changes,
    metadata: input.metadata,
  });
}

function meaningfulServiceChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { old: unknown; new: unknown }> | undefined {
  const changes = getChangedFields(before, after);
  if (!changes) return undefined;
  delete changes.updatedAt;
  return Object.keys(changes).length > 0 ? changes : undefined;
}

function locationScoped(
  column: typeof serviceType.locationId | typeof serviceCategory.locationId,
  locationId: string | null,
): SQL | undefined {
  if (!locationId) return isNull(column);
  return eq(column, locationId);
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "service";
}

async function uniqueServiceSlug(
  organizationId: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query.serviceType.findFirst({
      where: and(
        eq(serviceType.organizationId, organizationId),
        eq(serviceType.slug, slug),
      ),
      columns: { id: true },
    });

    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function uniqueCategorySlug(
  organizationId: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query.serviceCategory.findFirst({
      where: and(
        eq(serviceCategory.organizationId, organizationId),
        eq(serviceCategory.slug, slug),
      ),
      columns: { id: true },
    });

    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function assertServiceReferences(
  organizationId: string,
  locationId: string | null,
  categoryId?: string | null,
  classTypeId?: string | null,
): Promise<void> {
  if (categoryId) {
    const category = await db.query.serviceCategory.findFirst({
      where: and(
        eq(serviceCategory.id, categoryId),
        eq(serviceCategory.organizationId, organizationId),
        locationScoped(serviceCategory.locationId, locationId),
      ),
      columns: { id: true },
    });
    if (!category) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Service category not found",
      });
    }
  }

  if (classTypeId) {
    const linkedClassType = await db.query.classType.findFirst({
      where: and(
        eq(classTypeTable.id, classTypeId),
        eq(classTypeTable.organizationId, organizationId),
        locationId
          ? eq(classTypeTable.locationId, locationId)
          : isNull(classTypeTable.locationId),
      ),
      columns: { id: true },
    });
    if (!linkedClassType) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Class type not found",
      });
    }
  }
}

function moneyValue(value: number | null | undefined): string | null {
  return value == null ? null : value.toFixed(2);
}

function serviceValues(
  input: ResolvedServiceTypeInput,
  organizationId: string,
  locationId: string | null,
  slug: string,
  revenueCategory: RevenueCategorySnapshot | null,
  existingMetadata: unknown = {},
) {
  const metadata =
    typeof existingMetadata === "object" &&
    existingMetadata !== null &&
    !Array.isArray(existingMetadata)
      ? existingMetadata
      : {};
  return {
    organizationId,
    locationId,
    slug,
    name: input.name,
    description: input.description || null,
    categoryId: input.categoryId || null,
    classTypeId: input.classTypeId || null,
    experienceType: input.experienceType,
    format: input.format,
    defaultLocation: input.defaultLocation || null,
    durationMinutes: input.durationMinutes,
    capacity: input.capacity ?? null,
    bufferMinutes: input.bufferMinutes,
    roomIds: input.roomIds,
    instructorIds: input.instructorIds,
    paymentType: input.paymentType,
    visibility: input.visibility,
    price: moneyValue(input.price),
    slidingScaleMinPrice: moneyValue(input.slidingScaleMinPrice),
    slidingScaleMaxPrice: moneyValue(input.slidingScaleMaxPrice),
    currency: input.currency.toUpperCase(),
    revenueCategory: revenueCategory?.id ?? null,
    bookingRestrictionTags: input.bookingRestrictionTags,
    workoutTypes: input.workoutTypes,
    areasOfFocus: input.areasOfFocus,
    intensity: input.intensity || null,
    equipment: input.equipment,
    checkoutConfirmation: input.checkoutConfirmation || null,
    confirmationEmailBody: input.confirmationEmailBody || null,
    imageUrl: input.imageUrl || null,
    allowUnpaidBookings: input.allowUnpaidBookings,
    delaySchedulingHours: input.delaySchedulingHours ?? null,
    allowRecurringBookings: input.allowRecurringBookings,
    displayImageAtCheckout: input.displayImageAtCheckout,
    calendarColor: input.calendarColor || null,
    sortOrder: input.sortOrder ?? 0,
    metadata: {
      ...metadata,
      revenueCategorySnapshot: revenueCategory,
    },
    updatedAt: new Date(),
  };
}

export const serviceCatalogRouter = createTRPCRouter({
  categories: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await requireServiceCatalogAccess(
      ctx,
      "schedule.view",
    );

    return db
      .select({
        id: serviceCategory.id,
        name: serviceCategory.name,
        slug: serviceCategory.slug,
        description: serviceCategory.description,
        color: serviceCategory.color,
        sortOrder: serviceCategory.sortOrder,
        isActive: serviceCategory.isActive,
        createdAt: serviceCategory.createdAt,
      })
      .from(serviceCategory)
      .where(
        and(
          eq(serviceCategory.organizationId, organizationId),
          locationScoped(serviceCategory.locationId, ctx.locationId),
        ),
      )
      .orderBy(asc(serviceCategory.sortOrder), asc(serviceCategory.name));
  }),

  list: protectedProcedure
    .input(
      z
        .object({
          includeInactive: z.boolean().default(false),
          experienceType: serviceExperienceTypeSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.view",
      );
      const conditions: SQL[] = [
        eq(serviceType.organizationId, organizationId),
        locationScoped(serviceType.locationId, ctx.locationId),
      ].filter((condition): condition is SQL => condition !== undefined);

      if (!input?.includeInactive)
        conditions.push(eq(serviceType.isActive, true));
      if (input?.experienceType) {
        conditions.push(eq(serviceType.experienceType, input.experienceType));
      }

      return db
        .select({
          id: serviceType.id,
          name: serviceType.name,
          slug: serviceType.slug,
          description: serviceType.description,
          defaultLocation: serviceType.defaultLocation,
          experienceType: serviceType.experienceType,
          format: serviceType.format,
          paymentType: serviceType.paymentType,
          visibility: serviceType.visibility,
          durationMinutes: serviceType.durationMinutes,
          capacity: serviceType.capacity,
          bufferMinutes: serviceType.bufferMinutes,
          roomIds: serviceType.roomIds,
          instructorIds: serviceType.instructorIds,
          price: serviceType.price,
          slidingScaleMinPrice: serviceType.slidingScaleMinPrice,
          slidingScaleMaxPrice: serviceType.slidingScaleMaxPrice,
          currency: serviceType.currency,
          revenueCategory: serviceType.revenueCategory,
          bookingRestrictionTags: serviceType.bookingRestrictionTags,
          workoutTypes: serviceType.workoutTypes,
          areasOfFocus: serviceType.areasOfFocus,
          intensity: serviceType.intensity,
          equipment: serviceType.equipment,
          checkoutConfirmation: serviceType.checkoutConfirmation,
          confirmationEmailBody: serviceType.confirmationEmailBody,
          imageUrl: serviceType.imageUrl,
          allowUnpaidBookings: serviceType.allowUnpaidBookings,
          delaySchedulingHours: serviceType.delaySchedulingHours,
          allowRecurringBookings: serviceType.allowRecurringBookings,
          displayImageAtCheckout: serviceType.displayImageAtCheckout,
          calendarColor: serviceType.calendarColor,
          sortOrder: serviceType.sortOrder,
          isActive: serviceType.isActive,
          createdAt: serviceType.createdAt,
          updatedAt: serviceType.updatedAt,
          categoryId: serviceType.categoryId,
          categoryName: serviceCategory.name,
          categoryColor: serviceCategory.color,
          classTypeId: serviceType.classTypeId,
          classTypeName: classTypeTable.name,
          bookingWindowPolicyId: serviceType.bookingWindowPolicyId,
          waitlistPolicyId: serviceType.waitlistPolicyId,
          studioClassCount: count(studioClass.id),
        })
        .from(serviceType)
        .leftJoin(
          serviceCategory,
          eq(serviceType.categoryId, serviceCategory.id),
        )
        .leftJoin(
          classTypeTable,
          eq(serviceType.classTypeId, classTypeTable.id),
        )
        .leftJoin(studioClass, eq(studioClass.serviceTypeId, serviceType.id))
        .where(and(...conditions))
        .groupBy(serviceType.id, serviceCategory.id, classTypeTable.id)
        .orderBy(asc(serviceType.sortOrder), asc(serviceType.name));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.view",
      );
      const service = await db.query.serviceType.findFirst({
        where: and(
          eq(serviceType.id, input.id),
          ...exactServiceScope(organizationId, ctx.locationId),
        ),
      });
      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }
      return service;
    }),

  createCategory: protectedProcedure
    .input(categoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.manage",
      );
      const now = new Date();
      const slug = await uniqueCategorySlug(organizationId, input.name);

      const [createdCategory] = await db
        .insert(serviceCategory)
        .values({
          id: createId(),
          organizationId,
          locationId: ctx.locationId ?? null,
          name: input.name,
          slug,
          description: input.description || null,
          color: input.color || null,
          sortOrder: input.sortOrder ?? 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdCategory;
    }),

  create: protectedProcedure
    .input(serviceTypeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.manage",
      );
      await assertServiceReferences(
        organizationId,
        ctx.locationId,
        input.categoryId,
        input.classTypeId,
      );
      const revenueCategory = await resolveRevenueCategorySelection({
        scope: { organizationId, locationId: ctx.locationId },
        selection: input.revenueCategory,
      });

      const now = new Date();
      const slug = await uniqueServiceSlug(organizationId, input.name);
      const regionalContext = await getRegionalContext({
        organizationId,
        locationId: ctx.locationId,
      });
      const resolvedInput: ResolvedServiceTypeInput = {
        ...input,
        currency: resolveRegionalCurrency(
          input.currency,
          regionalContext.currency,
        ),
      };
      const [createdService] = await db
        .insert(serviceType)
        .values({
          id: createId(),
          ...serviceValues(
            resolvedInput,
            organizationId,
            ctx.locationId ?? null,
            slug,
            revenueCategory,
          ),
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await recordServiceActivity({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        service: createdService,
      });

      return createdService;
    }),

  update: protectedProcedure
    .input(serviceTypeUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.manage",
      );
      const existing = await db.query.serviceType.findFirst({
        where: and(
          eq(serviceType.id, input.id),
          ...exactServiceScope(organizationId, ctx.locationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }

      await assertServiceReferences(
        organizationId,
        ctx.locationId,
        input.categoryId,
        input.classTypeId,
      );
      const revenueCategory = await resolveRevenueCategorySelection({
        scope: { organizationId, locationId: ctx.locationId },
        selection: input.revenueCategory,
      });

      const parsedInput = serviceTypeUpdateInputSchema.parse(input);
      const resolvedInput: ResolvedServiceTypeInput = {
        ...parsedInput,
        currency: resolveRegionalCurrency(
          parsedInput.currency,
          existing.currency,
        ),
      };
      const slug =
        input.name !== existing.name
          ? await uniqueServiceSlug(organizationId, input.name, existing.id)
          : existing.slug;

      const [updatedService] = await db
        .update(serviceType)
        .set(
          serviceValues(
            resolvedInput,
            organizationId,
            ctx.locationId ?? null,
            slug,
            revenueCategory,
            existing.metadata,
          ),
        )
        .where(
          and(
            eq(serviceType.id, input.id),
            ...exactServiceScope(organizationId, ctx.locationId),
          ),
        )
        .returning();

      if (!updatedService) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }
      await recordServiceActivity({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        service: updatedService,
        changes: meaningfulServiceChanges(existing, updatedService),
      });

      return updatedService;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.manage",
      );
      const existing = await db.query.serviceType.findFirst({
        where: and(
          eq(serviceType.id, input.id),
          ...exactServiceScope(organizationId, ctx.locationId),
        ),
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }
      const [updatedService] = await db
        .update(serviceType)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(serviceType.id, input.id),
            ...exactServiceScope(organizationId, ctx.locationId),
          ),
        )
        .returning();

      if (!updatedService) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }

      await recordServiceActivity({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.ARCHIVED,
        service: updatedService,
        changes: meaningfulServiceChanges(existing, updatedService),
      });

      return updatedService;
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.manage",
      );
      const source = await db.query.serviceType.findFirst({
        where: and(
          eq(serviceType.id, input.id),
          ...exactServiceScope(organizationId, ctx.locationId),
        ),
      });
      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }

      const name = `${source.name} copy`;
      const slug = await uniqueServiceSlug(organizationId, name);
      const now = new Date();
      const [created] = await db
        .insert(serviceType)
        .values({
          ...source,
          id: createId(),
          name,
          slug,
          isActive: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await recordServiceActivity({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        service: created,
        metadata: {
          duplicatedFromId: source.id,
          duplicatedFromName: source.name,
        },
      });
      await recordServiceActivity({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        service: source,
        metadata: {
          action: "duplicated",
          duplicatedToId: created.id,
          duplicatedToName: created.name,
        },
      });
      return created;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireServiceCatalogAccess(
        ctx,
        "schedule.manage",
      );
      const existing = await db.query.serviceType.findFirst({
        where: and(
          eq(serviceType.id, input.id),
          ...exactServiceScope(organizationId, ctx.locationId),
        ),
        columns: { id: true, name: true, isActive: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service type not found",
        });
      }
      if (existing.isActive) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Archive this service type before deleting it.",
        });
      }

      const [classes, series, grants] = await Promise.all([
        db
          .select({ total: count() })
          .from(studioClass)
          .where(eq(studioClass.serviceTypeId, input.id)),
        db
          .select({ total: count() })
          .from(classSeries)
          .where(eq(classSeries.serviceTypeId, input.id)),
        db
          .select({ total: count() })
          .from(pricingOptionAccessGrant)
          .where(eq(pricingOptionAccessGrant.serviceTypeId, input.id)),
      ]);
      const dependencyCount =
        (classes[0]?.total ?? 0) +
        (series[0]?.total ?? 0) +
        (grants[0]?.total ?? 0);
      if (dependencyCount > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This service type is still used by classes, series, or pricing access rules. Keep it archived instead.",
        });
      }

      await db
        .delete(serviceType)
        .where(
          and(
            eq(serviceType.id, input.id),
            ...exactServiceScope(organizationId, ctx.locationId),
          ),
        );
      await recordServiceActivity({
        organizationId,
        locationId: ctx.locationId,
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        service: existing,
        metadata: {
          deletedName: existing.name,
          wasActive: existing.isActive,
        },
      });
      return { id: existing.id };
    }),
});
