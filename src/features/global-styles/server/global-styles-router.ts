/**
 * Global Styles tRPC Router
 *
 * Handles brand colors, fonts, button presets, and typography scales
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { form, funnel, globalStylePreset } from "@/db/schema";
import { createTRPCRouter } from "@/trpc/init";
import {
  publicationManageProcedure,
  publicationViewProcedure,
} from "@/features/permissions/server/publication-procedures";

const jsonRecord = z.record(z.string(), z.unknown());

const styleLocationWhere = (locationId: string | null) =>
  locationId
    ? eq(globalStylePreset.locationId, locationId)
    : isNull(globalStylePreset.locationId);

const styleScopeWhere = (
  id: string,
  organizationId: string,
  locationId: string | null,
) =>
  and(
    eq(globalStylePreset.id, id),
    eq(globalStylePreset.organizationId, organizationId),
    styleLocationWhere(locationId),
  );

export const globalStylesRouter = createTRPCRouter({
  /**
   * List all style presets for the current organization/location
   */
  list: publicationViewProcedure.query(async ({ ctx }) => {
    return await db.query.globalStylePreset.findMany({
      where: and(
        eq(globalStylePreset.organizationId, ctx.orgId!),
        styleLocationWhere(ctx.locationId),
      ),
      orderBy: [desc(globalStylePreset.isDefault), desc(globalStylePreset.createdAt)],
    });
  }),

  /**
   * Get a specific style preset
   */
  get: publicationViewProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const preset = await db.query.globalStylePreset.findFirst({
        where: styleScopeWhere(input.id, ctx.orgId!, ctx.locationId),
      });

      if (!preset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Style preset not found" });
      }

      return preset;
    }),

  /**
   * Create a new style preset
   */
  create: publicationManageProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        accentColor: z.string().optional(),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
        mutedColor: z.string().optional(),
        borderColor: z.string().optional(),
        fontFamily: z.string().optional(),
        headingFont: z.string().optional(),
        fontSize: jsonRecord.optional(),
        fontWeight: jsonRecord.optional(),
        lineHeight: jsonRecord.optional(),
        spacing: jsonRecord.optional(),
        borderRadius: jsonRecord.optional(),
        buttonPresets: jsonRecord.optional(),
        shadows: z.record(z.string(), z.string()).optional(),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(globalStylePreset)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(
              and(
                eq(globalStylePreset.organizationId, ctx.orgId!),
                ctx.locationId
                  ? eq(globalStylePreset.locationId, ctx.locationId)
                  : isNull(globalStylePreset.locationId),
                eq(globalStylePreset.isDefault, true)
              )
            );
        }

        const [preset] = await tx
          .insert(globalStylePreset)
          .values({
            id: crypto.randomUUID(),
            ...input,
            organizationId: ctx.orgId!,
            locationId: ctx.locationId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return preset;
      });
    }),

  /**
   * Update an existing style preset
   */
  update: publicationManageProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        accentColor: z.string().optional(),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
        mutedColor: z.string().optional(),
        borderColor: z.string().optional(),
        fontFamily: z.string().optional(),
        headingFont: z.string().optional(),
        fontSize: jsonRecord.optional(),
        fontWeight: jsonRecord.optional(),
        lineHeight: jsonRecord.optional(),
        spacing: jsonRecord.optional(),
        borderRadius: jsonRecord.optional(),
        buttonPresets: jsonRecord.optional(),
        shadows: z.record(z.string(), z.string()).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const preset = await db.query.globalStylePreset.findFirst({
        where: styleScopeWhere(id, ctx.orgId!, ctx.locationId),
      });

      if (!preset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Style preset not found" });
      }

      return await db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(globalStylePreset)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(
              and(
                eq(globalStylePreset.organizationId, ctx.orgId!),
                ctx.locationId
                  ? eq(globalStylePreset.locationId, ctx.locationId)
                  : isNull(globalStylePreset.locationId),
                eq(globalStylePreset.isDefault, true),
                ne(globalStylePreset.id, id)
              )
            );
        }

        const [updatedPreset] = await tx
          .update(globalStylePreset)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(globalStylePreset.id, id))
          .returning();

        return updatedPreset;
      });
    }),

  /**
   * Delete a style preset
   */
  delete: publicationManageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const preset = await db.query.globalStylePreset.findFirst({
        where: styleScopeWhere(input.id, ctx.orgId!, ctx.locationId),
      });

      if (!preset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Style preset not found" });
      }

      // Check if it's being used
      const [funnelCount, formCount] = await Promise.all([
        db.select({ count: count(funnel.id) }).from(funnel).where(eq(funnel.stylePresetId, input.id)),
        db.select({ count: count(form.id) }).from(form).where(eq(form.stylePresetId, input.id)),
      ]);

      const usedFunnels = funnelCount[0]?.count ?? 0;
      const usedForms = formCount[0]?.count ?? 0;

      if (usedFunnels > 0 || usedForms > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete preset. It's being used by ${usedFunnels} funnel(s) and ${usedForms} form(s).`,
        });
      }

      const [deletedPreset] = await db
        .delete(globalStylePreset)
        .where(eq(globalStylePreset.id, input.id))
        .returning();

      return deletedPreset;
    }),

  /**
   * Duplicate a style preset
   */
  duplicate: publicationManageProcedure
    .input(z.object({ id: z.string(), newName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const original = await db.query.globalStylePreset.findFirst({
        where: styleScopeWhere(input.id, ctx.orgId!, ctx.locationId),
      });

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Style preset not found" });
      }

      const { id, createdAt, updatedAt, ...data } = original;

      const [duplicatedPreset] = await db
        .insert(globalStylePreset)
        .values({
          id: crypto.randomUUID(),
          ...data,
          name: input.newName,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return duplicatedPreset;
    }),
});
