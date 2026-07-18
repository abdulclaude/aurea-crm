/**
 * Smart Sections tRPC Router
 *
 * Handles reusable block groups that can be inserted into funnels and forms
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { createTRPCRouter } from "@/trpc/init";
import {
  publicationManageProcedure,
  publicationViewProcedure,
} from "@/features/permissions/server/publication-procedures";
import { db } from "@/db";
import {
  form,
  funnelBlock,
  funnelPage,
  smartSection,
  smartSectionInstance,
} from "@/db/schema";
import type { JsonValue } from "@/db/json";

const jsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonSchema), z.record(z.string(), jsonSchema)])
);

const sectionScopeWhere = (
  id: string,
  organizationId: string,
  locationId: string | null,
) =>
  and(
    eq(smartSection.id, id),
    eq(smartSection.organizationId, organizationId),
    locationId
      ? eq(smartSection.locationId, locationId)
      : isNull(smartSection.locationId),
  );

export const smartSectionsRouter = createTRPCRouter({
  /**
   * List all smart sections for the current organization/location
   */
  list: publicationViewProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const sections = await db.query.smartSection.findMany({
        where: and(
          eq(smartSection.organizationId, ctx.orgId!),
          ctx.locationId ? eq(smartSection.locationId, ctx.locationId) : isNull(smartSection.locationId),
          input?.category ? eq(smartSection.category, input.category) : undefined
        ),
        with: {
          smartSectionInstances: {
            columns: { id: true },
          },
        },
        orderBy: [desc(smartSection.usageCount), desc(smartSection.createdAt)],
      });

      return sections.map((section) => ({
        ...section,
        _count: { smartSectionInstance: section.smartSectionInstances.length },
      }));
    }),

  /**
   * Get a specific smart section with full structure
   */
  get: publicationViewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const section = await db.query.smartSection.findFirst({
        where: sectionScopeWhere(input.id, ctx.orgId!, ctx.locationId),
        with: {
          smartSectionInstances: {
            with: {
              funnelPage: {
                columns: {
                  id: true,
                  name: true,
                },
                with: {
                  funnel: { columns: { id: true, name: true } },
                },
              },
              form: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Smart section not found" });
      }

      return {
        ...section,
        _count: { smartSectionInstance: section.smartSectionInstances.length },
      };
    }),

  /**
   * Get blocks for a smart section (for visual editor)
   */
  getBlocks: publicationViewProcedure
    .input(z.object({ sectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const section = await db.query.smartSection.findFirst({
        where: sectionScopeWhere(input.sectionId, ctx.orgId!, ctx.locationId),
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Smart section not found" });
      }

      const blocks = await db.query.funnelBlock.findMany({
        where: eq(funnelBlock.smartSectionId, input.sectionId),
        with: {
          funnelBreakpoints: true,
        },
        orderBy: [asc(funnelBlock.order)],
      });

      return blocks;
    }),

  /**
   * Create a new smart section from blocks
   */
  createFromBlocks: publicationManageProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        thumbnail: z.string().optional(),
        blockStructure: z.array(z.record(z.string(), jsonSchema)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [createdSection] = await db
        .insert(smartSection)
        .values({
          id: createId(),
          name: input.name,
          description: input.description,
          category: input.category,
          thumbnail: input.thumbnail,
          blockStructure: input.blockStructure,
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? null,
          usageCount: 0,
          updatedAt: new Date(),
        })
        .returning();

      if (!createdSection) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create smart section" });
      }

      return createdSection;
    }),

  /**
   * Update a smart section
   */
  update: publicationManageProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        thumbnail: z.string().optional(),
        blockStructure: z.array(z.record(z.string(), jsonSchema)).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const section = await db.query.smartSection.findFirst({
        where: sectionScopeWhere(id, ctx.orgId!, ctx.locationId),
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Smart section not found" });
      }

      const [updatedSection] = await db
        .update(smartSection)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(smartSection.id, id))
        .returning();

      if (!updatedSection) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update smart section" });
      }

      return updatedSection;
    }),

  /**
   * Delete a smart section (will also delete all instances in funnels/forms)
   */
  delete: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const section = await db.query.smartSection.findFirst({
        where: sectionScopeWhere(input.id, ctx.orgId!, ctx.locationId),
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Smart section not found" });
      }

      const [deletedSection] = await db.delete(smartSection).where(eq(smartSection.id, input.id)).returning();
      return deletedSection;
    }),

  /**
   * Insert a smart section instance into a funnel page or form
   * Creates a container block that references the smart section
   */
  insertInstance: publicationManageProcedure
    .input(
      z
        .object({
          sectionId: z.string(),
          funnelPageId: z.string().optional(),
          formId: z.string().optional(),
          order: z.number().optional(),
        })
        .refine(
          (value) => Boolean(value.funnelPageId) !== Boolean(value.formId),
          "Choose exactly one target",
        )
    )
    .mutation(async ({ ctx, input }) => {
      // Verify section exists and belongs to org
      const section = await db.query.smartSection.findFirst({
        where: sectionScopeWhere(input.sectionId, ctx.orgId!, ctx.locationId),
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Smart section not found" });
      }

      if (input.funnelPageId) {
        const page = await db.query.funnelPage.findFirst({
          where: eq(funnelPage.id, input.funnelPageId),
          with: { funnel: true },
        });
        if (
          !page?.funnel ||
          page.funnel.organizationId !== ctx.orgId ||
          page.funnel.locationId !== ctx.locationId
        ) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Funnel page not found" });
        }
      } else if (input.formId) {
        const selectedForm = await db.query.form.findFirst({
          where: and(
            eq(form.id, input.formId),
            eq(form.organizationId, ctx.orgId!),
            ctx.locationId
              ? eq(form.locationId, ctx.locationId)
              : isNull(form.locationId),
          ),
          columns: { id: true },
        });
        if (!selectedForm) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
        }
      }

      // Determine order if not provided
      let order = input.order;
      if (order === undefined && input.funnelPageId) {
        const highestOrder = await db.query.funnelBlock.findFirst({
          where: and(eq(funnelBlock.pageId, input.funnelPageId), isNull(funnelBlock.parentBlockId)),
          orderBy: [desc(funnelBlock.order)],
          columns: { order: true },
        });
        order = (highestOrder?.order ?? -1) + 1;
      }

      const result = await db.transaction(async (tx) => {
        const [instance] = await tx
          .insert(smartSectionInstance)
          .values({
            id: createId(),
            sectionId: input.sectionId,
            funnelPageId: input.funnelPageId,
            formId: input.formId,
            order: order || 0,
            updatedAt: new Date(),
          })
          .returning();

        if (!instance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create smart section instance" });
        }

        const [containerBlock] = input.funnelPageId
          ? await tx
              .insert(funnelBlock)
              .values({
                id: createId(),
                pageId: input.funnelPageId,
                smartSectionInstanceId: instance.id,
                type: "CONTAINER",
                props: {
                  smartSectionRef: true,
                  sectionName: section.name,
                },
                styles: { width: "100%" },
                order: order ?? 0,
                visible: true,
                locked: false,
                updatedAt: new Date(),
              })
              .returning()
          : [null];

        await tx
          .update(smartSection)
          .set({ usageCount: sql`${smartSection.usageCount} + 1`, updatedAt: new Date() })
          .where(eq(smartSection.id, input.sectionId));

        return { instance, containerBlock };
      });

      return result;
    }),

  /**
   * Remove a smart section instance
   */
  removeInstance: publicationManageProcedure
    .input(z.object({ instanceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const instance = await db.query.smartSectionInstance.findFirst({
        where: eq(smartSectionInstance.id, input.instanceId),
        with: {
          smartSection: true,
        },
      });

      if (!instance) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      }

      // Verify ownership
      if (
        instance.smartSection.organizationId !== ctx.orgId ||
        instance.smartSection.locationId !== ctx.locationId
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      }

      return db.transaction(async (tx) => {
        await tx
          .update(smartSection)
          .set({
            usageCount: sql`GREATEST(${smartSection.usageCount} - 1, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(smartSection.id, instance.smartSection.id));

        const [deletedInstance] = await tx
          .delete(smartSectionInstance)
          .where(eq(smartSectionInstance.id, input.instanceId))
          .returning();
        return deletedInstance;
      });
    }),

  /**
   * Get all categories
   */
  getCategories: publicationViewProcedure.query(async ({ ctx }) => {
    const sections = await db
      .selectDistinct({ category: smartSection.category })
      .from(smartSection)
      .where(
        and(
          eq(smartSection.organizationId, ctx.orgId!),
          ctx.locationId ? eq(smartSection.locationId, ctx.locationId) : isNull(smartSection.locationId)
        )
      );

    return sections
      .map((s) => s.category)
      .filter((c): c is string => c !== null);
  }),
});
