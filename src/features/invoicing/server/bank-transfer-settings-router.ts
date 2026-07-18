import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import z from "zod";

import { db } from "@/db";
import { bankTransferSettings } from "@/db/schema";
import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

type BankTransferContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

function exactLocationScope(locationId: string | null) {
  return locationId === null
    ? isNull(bankTransferSettings.locationId)
    : eq(bankTransferSettings.locationId, locationId);
}

async function requireBankTransferAccess(
  ctx: BankTransferContext,
  capability: Extract<Capability, "commerce.view" | "commerce.manage">,
): Promise<{ organizationId: string; locationId: string | null }> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization to manage bank transfer settings.",
    });
  }

  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
    resource: {
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
  });

  return { organizationId: ctx.orgId, locationId: ctx.locationId };
}

const bankTransferSettingsInput = z.object({
  enabled: z.boolean(),
  transferType: z
    .enum(["UK_DOMESTIC", "INTERNATIONAL", "US_DOMESTIC"])
    .optional(),
  bankName: z.string().trim().max(200).optional(),
  accountName: z.string().trim().max(200).optional(),
  accountNumber: z.string().trim().max(64).optional(),
  sortCode: z.string().trim().max(32).optional(),
  routingNumber: z.string().trim().max(64).optional(),
  iban: z.string().trim().max(64).optional(),
  swiftBic: z.string().trim().max(32).optional(),
  bankAddress: z
    .object({
      street: z.string().trim().max(200).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(100).optional(),
      zip: z.string().trim().max(32).optional(),
      country: z.string().trim().max(100).optional(),
    })
    .optional(),
  accountType: z.string().trim().max(100).optional(),
  currency: z.string().trim().length(3).default("GBP"),
  instructions: z.string().trim().max(2_000).optional(),
  referenceFormat: z.string().trim().max(200).optional(),
  autoReminders: z.boolean().default(true),
  reminderDays: z.array(z.number().int().positive()).max(20).optional(),
});

export const bankTransferSettingsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
    const scope = await requireBankTransferAccess(ctx, "commerce.view");

    const settings = await db.query.bankTransferSettings.findFirst({
      where: and(
        eq(bankTransferSettings.organizationId, scope.organizationId),
        exactLocationScope(scope.locationId),
      ),
    });

    return settings ?? null;
  }),

  upsert: protectedProcedure
    .input(bankTransferSettingsInput)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireBankTransferAccess(ctx, "commerce.manage");
      const { bankAddress, reminderDays, ...data } = input;
      const updateData = {
        ...data,
        bankAddress: bankAddress ?? null,
        reminderDays: reminderDays ?? null,
      };
      const scopeWhere = and(
        eq(bankTransferSettings.organizationId, scope.organizationId),
        exactLocationScope(scope.locationId),
      );
      const existing = await db.query.bankTransferSettings.findFirst({
        where: scopeWhere,
        columns: { id: true },
      });

      if (existing) {
        const [settings] = await db
          .update(bankTransferSettings)
          .set({ ...updateData, updatedAt: new Date() })
          .where(and(eq(bankTransferSettings.id, existing.id), scopeWhere))
          .returning();

        return settings;
      }

      const [settings] = await db
        .insert(bankTransferSettings)
        .values({
          id: createId(),
          organizationId: scope.organizationId,
          locationId: scope.locationId,
          ...updateData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return settings;
    }),

  delete: protectedProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const scope = await requireBankTransferAccess(ctx, "commerce.manage");
      const scopeWhere = and(
        eq(bankTransferSettings.organizationId, scope.organizationId),
        exactLocationScope(scope.locationId),
      );
      const settings = await db.query.bankTransferSettings.findFirst({
        where: scopeWhere,
        columns: { id: true },
      });

      if (!settings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank transfer settings not found",
        });
      }

      await db
        .delete(bankTransferSettings)
        .where(and(eq(bankTransferSettings.id, settings.id), scopeWhere));

      return { success: true };
    }),
});
