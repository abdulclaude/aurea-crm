import { TRPCError } from "@trpc/server";
import z from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const bankTransferSettingsRouter = createTRPCRouter({
  // Get bank transfer settings for organization/subaccount
  get: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        subaccountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const orgId = input.organizationId || ctx.orgId;
        const subaccountId = input.subaccountId || ctx.subaccountId;

        if (!orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Organization ID is required",
          });
        }

        console.log('[BankTransfer] Fetching settings for:', { orgId, subaccountId });

        const settings = await prisma.bankTransferSettings.findFirst({
          where: {
            organizationId: orgId,
            subaccountId: subaccountId || null,
          },
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
        subaccountId: z.string().optional(),
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
        const subaccountId = input.subaccountId || ctx.subaccountId;

        if (!orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Organization ID is required",
          });
        }

        console.log('[BankTransfer] Upserting settings:', { orgId, subaccountId, input });

        const {
          organizationId: _orgId,
          subaccountId: _subaccountId,
          bankAddress,
          reminderDays,
          ...data
        } = input;

        // Prepare data for upsert, handling JSON fields properly
        const updateData = {
          ...data,
          bankAddress: bankAddress || null,
          reminderDays: reminderDays || null,
        };

        console.log('[BankTransfer] Update data:', updateData);

        // Check if settings already exist
        const existing = await prisma.bankTransferSettings.findFirst({
          where: {
            organizationId: orgId,
            subaccountId: subaccountId || null,
          },
        });

        console.log('[BankTransfer] Existing settings:', existing);

        let settings;
        if (existing) {
          // Update existing settings
          settings = await prisma.bankTransferSettings.update({
            where: { id: existing.id },
            data: {
              ...(updateData as any),
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new settings
          settings = await prisma.bankTransferSettings.create({
            data: {
              id: crypto.randomUUID(),
              organizationId: orgId,
              subaccountId: subaccountId || null,
              ...(updateData as any),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
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
        subaccountId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.orgId;
      const subaccountId = input.subaccountId || ctx.subaccountId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization ID is required",
        });
      }

      // Find the settings first
      const settings = await prisma.bankTransferSettings.findFirst({
        where: {
          organizationId: orgId,
          subaccountId: subaccountId || null,
        },
      });

      if (!settings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank transfer settings not found",
        });
      }

      await prisma.bankTransferSettings.delete({
        where: {
          id: settings.id,
        },
      });

      return { success: true };
    }),
});
