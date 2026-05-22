import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { classType as classTypeTable, studioClass } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, count, eq, isNull, ne, type SQL } from "drizzle-orm";

const classTypeScopeConditions = ({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string | null;
}): SQL[] => [
  eq(classTypeTable.organizationId, organizationId),
  locationId
    ? eq(classTypeTable.locationId, locationId)
    : isNull(classTypeTable.locationId),
];

const selectClassTypesWithClassCount = (conditions: SQL[]) =>
  db
    .select({
      classType: classTypeTable,
      studioClassCount: count(studioClass.id),
    })
    .from(classTypeTable)
    .leftJoin(studioClass, eq(studioClass.classTypeId, classTypeTable.id))
    .where(and(...conditions))
    .groupBy(classTypeTable.id)
    .orderBy(asc(classTypeTable.name));

const withCount = (row: {
  classType: typeof classTypeTable.$inferSelect;
  studioClassCount: number;
}) => ({
  ...row.classType,
  _count: { studioClass: row.studioClassCount },
});

export const classTypesRouter = createTRPCRouter({
  /**
   * List all class types for the current org/location
   */
  list: protectedProcedure
    .input(
      z
        .object({
          includeInactive: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const conditions = classTypeScopeConditions({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
      });
      if (!input?.includeInactive) {
        conditions.push(eq(classTypeTable.isActive, true));
      }

      const classTypes = await selectClassTypesWithClassCount(conditions);
      return classTypes.map(withCount);
    }),

  /**
   * Get a single class type by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [classType] = await selectClassTypesWithClassCount([
        eq(classTypeTable.id, input.id),
        ...classTypeScopeConditions({
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
        }),
      ]);

      if (!classType) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class type not found" });
      }

      return withCount(classType);
    }),

  /**
   * Create a new class type
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(100),
        description: z.string().max(500).optional(),
        color: z.string().max(20).optional(),
        icon: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      // Generate slug from name
      const baseSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Ensure slug uniqueness within org
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const [existing] = await db
          .select({ id: classTypeTable.id })
          .from(classTypeTable)
          .where(
            and(
              eq(classTypeTable.organizationId, ctx.orgId),
              eq(classTypeTable.slug, slug)
            )
          )
          .limit(1);
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const [createdClassType] = await db
        .insert(classTypeTable)
        .values({
          id: createId(),
          name: input.name,
          slug,
          description: input.description,
          color: input.color,
          icon: input.icon,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return createdClassType;
    }),

  /**
   * Update a class type
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        color: z.string().max(20).optional().nullable(),
        icon: z.string().max(50).optional().nullable(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const { id, ...data } = input;

      const [existing] = await db
        .select()
        .from(classTypeTable)
        .where(and(eq(classTypeTable.id, id), eq(classTypeTable.organizationId, ctx.orgId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class type not found" });
      }

      // If name changed, regenerate slug
      let slug: string | undefined;
      if (data.name && data.name !== existing.name) {
        const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        slug = baseSlug;
        let counter = 1;
        while (true) {
          const [conflict] = await db
            .select({ id: classTypeTable.id })
            .from(classTypeTable)
            .where(
              and(
                eq(classTypeTable.organizationId, ctx.orgId),
                eq(classTypeTable.slug, slug),
                ne(classTypeTable.id, id)
              )
            )
            .limit(1);
          if (!conflict) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      const [updatedClassType] = await db
        .update(classTypeTable)
        .set({ ...data, ...(slug ? { slug } : {}), updatedAt: new Date() })
        .where(eq(classTypeTable.id, id))
        .returning();

      return updatedClassType;
    }),

  /**
   * Delete a class type (soft delete by setting isActive = false)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [existing] = await selectClassTypesWithClassCount([
        eq(classTypeTable.id, input.id),
        eq(classTypeTable.organizationId, ctx.orgId),
      ]);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class type not found" });
      }

      if (existing.studioClassCount > 0) {
        const [updatedClassType] = await db
          .update(classTypeTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(classTypeTable.id, input.id))
          .returning();

        return updatedClassType;
      }

      const [deletedClassType] = await db
        .delete(classTypeTable)
        .where(eq(classTypeTable.id, input.id))
        .returning();

      return deletedClassType;
    }),
});
