import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";
import z from "zod";
import { db } from "@/db";
import { bankTransferSettings } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const bankTransferSettingsRouter = createTRPCRouter({
  // Get bank transfer settings for organization/location
  get: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const orgId = input.organizationId || ctx.orgId;
        const locationId = input.locationId || ctx.locationId;

        if (!orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Organization ID is required",
          });
        }

        console.log('[BankTransfer] Fetching settings for:', { orgId, locationId });

        const settings = await db.query.bankTransferSettings.findFirst({
          where: and(
            eq(bankTransferSettings.organizationId, orgId),
            locationId
              ? eq(bankTransferSettings.locationId, locationId)
              : isNull(bankTransferSettings.locationId)
          ),
        });

        console.log('[BankTransfer] Found settings:', settings);

        return settings;
      } catch (error) {
        console.error('[BankTransfer] Error fetching settings:', error);
        throw error;
      }
    }),

  // Create or update bank transfer settings
  upsert: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
        enabled: z.boolean(),
        transferType: z.enum(["UK_DOMESTIC", "INTERNATIONAL", "US_DOMESTIC"]).optional(),
        bankName: z.string().optional(),
        accountName: z.string().optional(),
        accountNumber: z.string().optional(),
        sortCode: z.string().optional(),
        routingNumber: z.string().optional(),
        iban: z.string().optional(),
        swiftBic: z.string().optional(),
        bankAddress: z
          .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
        accountType: z.string().optional(),
        currency: z.string().default("GBP"),
        instructions: z.string().optional(),
        referenceFormat: z.string().optional(),
        autoReminders: z.boolean().default(true),
        reminderDays: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const orgId = input.organizationId || ctx.orgId;
        const locationId = input.locationId || ctx.locationId;

        if (!orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Organization ID is required",
          });
        }

        console.log('[BankTransfer] Upserting settings:', { orgId, locationId, input });

        const {
          organizationId: _orgId,
          locationId: _locationId,
          bankAddress,
          reminderDays,
          ...data
        } = input;

        const updateData = {
          ...data,
          bankAddress: bankAddress || null,
          reminderDays: reminderDays || null,
        };

        console.log('[BankTransfer] Update data:', updateData);

        // Check if settings already exist
        const existing = await db.query.bankTransferSettings.findFirst({
          where: and(
            eq(bankTransferSettings.organizationId, orgId),
            locationId
              ? eq(bankTransferSettings.locationId, locationId)
              : isNull(bankTransferSettings.locationId)
          ),
        });

        console.log('[BankTransfer] Existing settings:', existing);

        let settings;
        if (existing) {
          [settings] = await db
            .update(bankTransferSettings)
            .set({
              ...updateData,
              updatedAt: new Date(),
            })
            .where(eq(bankTransferSettings.id, existing.id))
            .returning();
        } else {
          [settings] = await db
            .insert(bankTransferSettings)
            .values({
              id: createId(),
              organizationId: orgId,
              locationId: locationId || null,
              ...updateData,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
        }

        console.log('[BankTransfer] Saved settings:', settings);

        return settings;
      } catch (error) {
        console.error('[BankTransfer] Error upserting settings:', error);
        throw error;
      }
    }),

  // Delete bank transfer settings
  delete: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.orgId;
      const locationId = input.locationId || ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization ID is required",
        });
      }

      // Find the settings first
      const settings = await db.query.bankTransferSettings.findFirst({
        where: and(
          eq(bankTransferSettings.organizationId, orgId),
          locationId
            ? eq(bankTransferSettings.locationId, locationId)
            : isNull(bankTransferSettings.locationId)
        ),
      });

      if (!settings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank transfer settings not found",
        });
      }

      await db
        .delete(bankTransferSettings)
        .where(eq(bankTransferSettings.id, settings.id));

      return { success: true };
    }),
});
