import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  classType,
  serviceCategory,
  serviceType,
  studioClass,
} from "@/db/schema";
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
const optionalPositiveIntSchema = z.number().int().positive().optional().nullable();
const optionalNonNegativeIntSchema = z.number().int().min(0).optional().nullable();

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
    currency: z.string().trim().length(3).default("GBP"),
    revenueCategory: z.string().trim().max(120).optional().nullable(),
    bookingRestrictionTags: z.array(z.string().trim().min(1).max(80)).default([]),
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
      if (value.slidingScaleMinPrice == null || value.slidingScaleMaxPrice == null) {
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

function requireOrg(ctx: { orgId: string | null }): string {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }

  return ctx.orgId;
}

function locationScoped(
  column:
    | typeof serviceType.locationId
    | typeof serviceCategory.locationId
    | typeof classType.locationId,
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
      where: and(eq(serviceType.organizationId, organizationId), eq(serviceType.slug, slug)),
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
      where: and(eq(serviceCategory.organizationId, organizationId), eq(serviceCategory.slug, slug)),
      columns: { id: true },
    });

    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function assertServiceReferences(
  organizationId: string,
  categoryId?: string | null,
  classTypeId?: string | null,
): Promise<void> {
  if (categoryId) {
    const category = await db.query.serviceCategory.findFirst({
      where: and(
        eq(serviceCategory.id, categoryId),
        eq(serviceCategory.organizationId, organizationId),
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
      where: and(eq(classType.id, classTypeId), eq(classType.organizationId, organizationId)),
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
  input: ServiceTypeInput,
  organizationId: string,
  locationId: string | null,
  slug: string,
) {
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
    revenueCategory: input.revenueCategory || null,
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
    updatedAt: new Date(),
  };
}

export const serviceCatalogRouter = createTRPCRouter({
  categories: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);

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
      const organizationId = requireOrg(ctx);
      const conditions: SQL[] = [
        eq(serviceType.organizationId, organizationId),
        locationScoped(serviceType.locationId, ctx.locationId),
      ].filter((condition): condition is SQL => condition !== undefined);

      if (!input?.includeInactive) conditions.push(eq(serviceType.isActive, true));
      if (input?.experienceType) {
        conditions.push(eq(serviceType.experienceType, input.experienceType));
      }

      return db
        .select({
          id: serviceType.id,
          name: serviceType.name,
          slug: serviceType.slug,
          description: serviceType.description,
          experienceType: serviceType.experienceType,
          format: serviceType.format,
          paymentType: serviceType.paymentType,
          visibility: serviceType.visibility,
          durationMinutes: serviceType.durationMinutes,
          capacity: serviceType.capacity,
          bufferMinutes: serviceType.bufferMinutes,
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
          allowUnpaidBookings: serviceType.allowUnpaidBookings,
          delaySchedulingHours: serviceType.delaySchedulingHours,
          allowRecurringBookings: serviceType.allowRecurringBookings,
          displayImageAtCheckout: serviceType.displayImageAtCheckout,
          calendarColor: serviceType.calendarColor,
          isActive: serviceType.isActive,
          categoryId: serviceType.categoryId,
          categoryName: serviceCategory.name,
          categoryColor: serviceCategory.color,
          classTypeId: serviceType.classTypeId,
          classTypeName: classType.name,
          studioClassCount: count(studioClass.id),
        })
        .from(serviceType)
        .leftJoin(serviceCategory, eq(serviceType.categoryId, serviceCategory.id))
        .leftJoin(classType, eq(serviceType.classTypeId, classType.id))
        .leftJoin(studioClass, eq(studioClass.serviceTypeId, serviceType.id))
        .where(and(...conditions))
        .groupBy(
          serviceType.id,
          serviceCategory.id,
          classType.id,
        )
        .orderBy(asc(serviceType.sortOrder), asc(serviceType.name));
    }),

  createCategory: protectedProcedure
    .input(categoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
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
      const organizationId = requireOrg(ctx);
      await assertServiceReferences(organizationId, input.categoryId, input.classTypeId);

      const now = new Date();
      const slug = await uniqueServiceSlug(organizationId, input.name);
      const [createdService] = await db
        .insert(serviceType)
        .values({
          id: createId(),
          ...serviceValues(input, organizationId, ctx.locationId ?? null, slug),
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdService;
    }),

  update: protectedProcedure
    .input(serviceTypeInputSchema.partial().extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const existing = await db.query.serviceType.findFirst({
        where: and(eq(serviceType.id, input.id), eq(serviceType.organizationId, organizationId)),
        columns: { id: true, name: true, slug: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service type not found" });
      }

      await assertServiceReferences(organizationId, input.categoryId, input.classTypeId);

      const mergedInput = serviceTypeInputSchema.parse({
        ...input,
        name: input.name ?? existing.name,
      });
      const slug =
        input.name && input.name !== existing.name
          ? await uniqueServiceSlug(organizationId, input.name, existing.id)
          : existing.slug;

      const [updatedService] = await db
        .update(serviceType)
        .set(serviceValues(mergedInput, organizationId, ctx.locationId ?? null, slug))
        .where(eq(serviceType.id, input.id))
        .returning();

      return updatedService;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const [updatedService] = await db
        .update(serviceType)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(serviceType.id, input.id), eq(serviceType.organizationId, organizationId)))
        .returning();

      if (!updatedService) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service type not found" });
      }

      return updatedService;
    }),

  backfillFromClassTypes: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);

    const existingServices = await db
      .select({ classTypeId: serviceType.classTypeId })
      .from(serviceType)
      .where(eq(serviceType.organizationId, organizationId));
    const linkedClassTypeIds = new Set(
      existingServices
        .map((service) => service.classTypeId)
        .filter((id): id is string => Boolean(id)),
    );

    const classTypes = await db
      .select({
        id: classType.id,
        name: classType.name,
        description: classType.description,
        color: classType.color,
      })
      .from(classType)
      .where(
        and(
          eq(classType.organizationId, organizationId),
          locationScoped(classType.locationId, ctx.locationId),
          eq(classType.isActive, true),
        ),
      )
      .orderBy(asc(classType.name));

    const missingClassTypes = classTypes.filter((item) => !linkedClassTypeIds.has(item.id));
    if (missingClassTypes.length === 0) return { created: 0 };

    await db.transaction(async (tx) => {
      for (const item of missingClassTypes) {
        const slug = await uniqueServiceSlug(organizationId, item.name);
        await tx.insert(serviceType).values({
          id: createId(),
          organizationId,
          locationId: ctx.locationId ?? null,
          classTypeId: item.id,
          name: item.name,
          slug,
          description: item.description,
          experienceType: "CLASS",
          format: "IN_PERSON",
          durationMinutes: 60,
          bufferMinutes: 0,
          paymentType: "PACKAGE_ONLY",
          visibility: "PUBLIC",
          currency: "GBP",
          calendarColor: item.color,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    return { created: missingClassTypes.length };
  }),
});
