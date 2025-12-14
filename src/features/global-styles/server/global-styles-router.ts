/**
 * Global Styles tRPC Router
 *
 * Handles brand colors, fonts, button presets, and typography scales
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import db from "@/lib/db";

export const globalStylesRouter = createTRPCRouter({
  /**
   * List all style presets for the current organization/subaccount
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.globalStylePreset.findMany({
      where: {
        organizationId: ctx.orgId!,
        subaccountId: ctx.subaccountId ?? null,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }),

  /**
   * Get a specific style preset
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const preset = await db.globalStylePreset.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
      });

      if (!preset) {
        throw new Error("Style preset not found");
      }

      return preset;
    }),

  /**
   * Create a new style preset
   */
  create: protectedProcedure
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
        fontSize: z.record(z.number(), z.any()).optional(),
        fontWeight: z.record(z.number(), z.any()).optional(),
        lineHeight: z.record(z.number(), z.any()).optional(),
        spacing: z.record(z.number(), z.any()).optional(),
        borderRadius: z.record(z.number(), z.any()).optional(),
        buttonPresets: z.record(z.any(), z.any()).optional(),
        shadows: z.record(z.string(), z.string()).optional(),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as default, unset other defaults first
      if (input.isDefault) {
        await db.globalStylePreset.updateMany({
          where: {
            organizationId: ctx.orgId!,
            subaccountId: ctx.subaccountId ?? null,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      return await db.globalStylePreset.create({
        data: {
          id: crypto.randomUUID(),
          ...input,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }),

  /**
   * Update an existing style preset
   */
  update: protectedProcedure
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
        fontSize: z.record(z.number(), z.any()).optional(),
        fontWeight: z.record(z.number(), z.any()).optional(),
        lineHeight: z.record(z.number(), z.any()).optional(),
        spacing: z.record(z.number(), z.any()).optional(),
        borderRadius: z.record(z.number(), z.any()).optional(),
        buttonPresets: z.record(z.any(), z.any()).optional(),
        shadows: z.record(z.string(), z.string()).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const preset = await db.globalStylePreset.findFirst({
        where: {
          id,
          organizationId: ctx.orgId!,
        },
      });

      if (!preset) {
        throw new Error("Style preset not found");
      }

      // If setting as default, unset other defaults first
      if (input.isDefault) {
        await db.globalStylePreset.updateMany({
          where: {
            organizationId: ctx.orgId!,
            subaccountId: ctx.subaccountId ?? null,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      return await db.globalStylePreset.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a style preset
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const preset = await db.globalStylePreset.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
      });

      if (!preset) {
        throw new Error("Style preset not found");
      }

      // Check if it's being used
      const [funnelCount, formCount] = await Promise.all([
        db.funnel.count({ where: { stylePresetId: input.id } }),
        db.form.count({ where: { stylePresetId: input.id } }),
      ]);

      if (funnelCount > 0 || formCount > 0) {
        throw new Error(
          `Cannot delete preset. It's being used by ${funnelCount} funnel(s) and ${formCount} form(s).`
        );
      }

      return await db.globalStylePreset.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Duplicate a style preset
   */
  duplicate: protectedProcedure
    .input(z.object({ id: z.string(), newName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const original = await db.globalStylePreset.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId!,
        },
      });

      if (!original) {
        throw new Error("Style preset not found");
      }

      const { id, createdAt, updatedAt, ...data } = original;

      return await db.globalStylePreset.create({
        data: {
          id: crypto.randomUUID(),
          ...(data as any),
          name: input.newName,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }),
});
