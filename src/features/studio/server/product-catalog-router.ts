import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { commerceTaxAssignment, studioProduct } from "@/db/schema";
import { requireCommerceSettingsAccess } from "@/features/commerce-settings/server/access";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const StudioProductTypeSchema = z.enum([
  "MEMBERSHIP_PLAN",
  "CLASS_PACK",
  "RETAIL",
  "FEE",
  "ACCOUNT_CREDIT",
  "SHIPPING",
  "TIP",
  "EXTERNAL_REVENUE",
  "GIFT_CARD",
  "OTHER",
]);

const ProductBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  type: StudioProductTypeSchema.default("OTHER"),
  category: z.string().trim().max(120).optional().nullable(),
  sku: z.string().trim().max(120).optional().nullable(),
  externalId: z.string().trim().max(120).optional().nullable(),
  price: z.number().min(0).default(0),
  cost: z.number().min(0).optional().nullable(),
  currency: z.string().trim().length(3).default("GBP"),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.number().int().min(0).optional().nullable(),
  lowStockThreshold: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});

const catalogScopeConditions = ({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string | null;
}): SQL[] => [
  eq(studioProduct.organizationId, organizationId),
  isNull(studioProduct.deletedAt),
  locationId
    ? or(
        eq(studioProduct.locationId, locationId),
        isNull(studioProduct.locationId),
      )!
    : isNull(studioProduct.locationId),
];

export const productCatalogRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
          type: StudioProductTypeSchema.optional(),
          includeInactive: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const scope = await requireCommerceSettingsAccess(ctx, "commerce.view");
      const conditions = catalogScopeConditions(scope);

      if (!input?.includeInactive)
        conditions.push(eq(studioProduct.isActive, true));
      if (input?.type) conditions.push(eq(studioProduct.type, input.type));
      if (input?.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          or(
            ilike(studioProduct.name, pattern),
            ilike(studioProduct.sku, pattern),
            ilike(studioProduct.category, pattern),
          )!,
        );
      }

      return db.query.studioProduct.findMany({
        where: and(...conditions),
        orderBy: [
          asc(studioProduct.type),
          asc(studioProduct.category),
          asc(studioProduct.name),
        ],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const scope = await requireCommerceSettingsAccess(ctx, "commerce.view");

      const product = await db.query.studioProduct.findFirst({
        where: and(
          eq(studioProduct.id, input.id),
          eq(studioProduct.organizationId, scope.organizationId),
          scope.locationId
            ? or(
                eq(studioProduct.locationId, scope.locationId),
                isNull(studioProduct.locationId),
              )
            : isNull(studioProduct.locationId),
          isNull(studioProduct.deletedAt),
        ),
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product;
    }),

  create: protectedProcedure
    .input(ProductBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCommerceSettingsAccess(ctx, "commerce.manage");

      const now = new Date();
      const [createdProduct] = await db
        .insert(studioProduct)
        .values({
          id: createId(),
          organizationId: scope.organizationId,
          locationId: scope.locationId,
          externalId: input.externalId || null,
          sku: input.sku || null,
          name: input.name,
          description: input.description || null,
          type: input.type,
          category: input.category || null,
          price: input.price.toString(),
          cost: input.cost?.toString() ?? null,
          currency: input.currency.toUpperCase(),
          taxRate: input.taxRate?.toString() ?? null,
          trackInventory: input.trackInventory,
          stockQuantity: input.stockQuantity ?? null,
          lowStockThreshold: input.lowStockThreshold ?? null,
          isActive: input.isActive,
          isPublic: input.isPublic,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdProduct;
    }),

  update: protectedProcedure
    .input(ProductBaseSchema.partial().extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCommerceSettingsAccess(ctx, "commerce.manage");

      const { id, price, cost, taxRate, ...data } = input;
      const existing = await db.query.studioProduct.findFirst({
        where: and(
          eq(studioProduct.id, id),
          eq(studioProduct.organizationId, scope.organizationId),
          scope.locationId
            ? eq(studioProduct.locationId, scope.locationId)
            : isNull(studioProduct.locationId),
          isNull(studioProduct.deletedAt),
        ),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const [updatedProduct] = await db
        .update(studioProduct)
        .set({
          ...data,
          ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
          ...(price !== undefined ? { price: price.toString() } : {}),
          ...(cost !== undefined
            ? { cost: cost === null ? null : cost.toString() }
            : {}),
          ...(taxRate !== undefined
            ? { taxRate: taxRate === null ? null : taxRate.toString() }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(studioProduct.id, id),
            eq(studioProduct.organizationId, scope.organizationId),
            scope.locationId
              ? eq(studioProduct.locationId, scope.locationId)
              : isNull(studioProduct.locationId),
          ),
        )
        .returning();

      return updatedProduct;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCommerceSettingsAccess(ctx, "commerce.manage");

      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            id: studioProduct.id,
            locationId: studioProduct.locationId,
          })
          .from(studioProduct)
          .where(
            and(
              eq(studioProduct.id, input.id),
              eq(studioProduct.organizationId, scope.organizationId),
              scope.locationId
                ? eq(studioProduct.locationId, scope.locationId)
                : isNull(studioProduct.locationId),
              isNull(studioProduct.deletedAt),
            ),
          )
          .limit(1)
          .for("update");

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        const now = new Date();
        await tx
          .update(commerceTaxAssignment)
          .set({
            archivedAt: now,
            archivedById: ctx.auth.user.id,
            updatedById: ctx.auth.user.id,
            updatedAt: now,
          })
          .where(
            and(
              eq(commerceTaxAssignment.organizationId, scope.organizationId),
              scope.locationId
                ? eq(commerceTaxAssignment.locationId, scope.locationId)
                : isNull(commerceTaxAssignment.locationId),
              eq(commerceTaxAssignment.productId, existing.id),
              isNull(commerceTaxAssignment.archivedAt),
            ),
          );

        const [archivedProduct] = await tx
          .update(studioProduct)
          .set({ isActive: false, deletedAt: now, updatedAt: now })
          .where(eq(studioProduct.id, existing.id))
          .returning();

        return archivedProduct;
      });
    }),

  categories: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCommerceSettingsAccess(ctx, "commerce.view");

    const rows = await db.query.studioProduct.findMany({
      where: and(
        eq(studioProduct.organizationId, scope.organizationId),
        scope.locationId
          ? or(
              eq(studioProduct.locationId, scope.locationId),
              isNull(studioProduct.locationId),
            )
          : isNull(studioProduct.locationId),
        isNull(studioProduct.deletedAt),
      ),
      columns: { category: true },
      orderBy: desc(studioProduct.updatedAt),
    });

    return Array.from(
      new Set(rows.map((row) => row.category).filter(Boolean)),
    ).sort();
  }),
});
