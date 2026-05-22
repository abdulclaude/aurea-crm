import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { studioProduct } from "@/db/schema";
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
    ? or(eq(studioProduct.locationId, locationId), isNull(studioProduct.locationId))!
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
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }

      const conditions = catalogScopeConditions({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
      });

      if (!input?.includeInactive) conditions.push(eq(studioProduct.isActive, true));
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
        orderBy: [asc(studioProduct.type), asc(studioProduct.category), asc(studioProduct.name)],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }

      const product = await db.query.studioProduct.findFirst({
        where: and(
          eq(studioProduct.id, input.id),
          eq(studioProduct.organizationId, ctx.orgId),
          isNull(studioProduct.deletedAt),
        ),
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return product;
    }),

  create: protectedProcedure.input(ProductBaseSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.orgId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
    }

    const now = new Date();
    const [createdProduct] = await db
      .insert(studioProduct)
      .values({
        id: createId(),
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
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
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }

      const { id, price, cost, taxRate, ...data } = input;
      const existing = await db.query.studioProduct.findFirst({
        where: and(eq(studioProduct.id, id), eq(studioProduct.organizationId, ctx.orgId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const [updatedProduct] = await db
        .update(studioProduct)
        .set({
          ...data,
          ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
          ...(price !== undefined ? { price: price.toString() } : {}),
          ...(cost !== undefined ? { cost: cost === null ? null : cost.toString() } : {}),
          ...(taxRate !== undefined ? { taxRate: taxRate === null ? null : taxRate.toString() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(studioProduct.id, id))
        .returning();

      return updatedProduct;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      }

      const existing = await db.query.studioProduct.findFirst({
        where: and(eq(studioProduct.id, input.id), eq(studioProduct.organizationId, ctx.orgId)),
        columns: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const [archivedProduct] = await db
        .update(studioProduct)
        .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(studioProduct.id, input.id))
        .returning();

      return archivedProduct;
    }),

  categories: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
    }

    const rows = await db.query.studioProduct.findMany({
      where: and(
        eq(studioProduct.organizationId, ctx.orgId),
        ctx.locationId
          ? or(eq(studioProduct.locationId, ctx.locationId), isNull(studioProduct.locationId))
          : isNull(studioProduct.locationId),
        isNull(studioProduct.deletedAt),
      ),
      columns: { category: true },
      orderBy: desc(studioProduct.updatedAt),
    });

    return Array.from(new Set(rows.map((row) => row.category).filter(Boolean))).sort();
  }),
});
