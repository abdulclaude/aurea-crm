import {
  archiveOfflinePaymentMethodSchema,
  archiveRevenueCategorySchema,
  archiveTaxAssignmentSchema,
  archiveTaxRateSchema,
  approveGuestPassSchema,
  createOfflinePaymentMethodSchema,
  createRevenueCategorySchema,
  createTaxRateSchema,
  issueGuestPassSchema,
  listGuestPassesSchema,
  redeemGuestPassSchema,
  saveDocumentDefaultsSchema,
  updateOfflinePaymentMethodSchema,
  updateRevenueCategorySchema,
  updateTaxRateSchema,
  upsertTaxAssignmentSchema,
  versionGuestPassPolicySchema,
  revokeGuestPassSchema,
} from "@/features/commerce-settings/contracts";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { requireCommerceSettingsAccess } from "./access";
import {
  archiveOfflinePaymentMethod,
  archiveRevenueCategory,
  archiveTaxAssignment,
  archiveTaxRate,
  createOfflinePaymentMethod,
  createRevenueCategory,
  createTaxRate,
  saveDocumentDefaults,
  updateOfflinePaymentMethod,
  updateRevenueCategory,
  updateTaxRate,
  upsertTaxAssignment,
  versionGuestPassPolicy,
} from "./mutation-service";
import { getCommerceSettings } from "./query-service";
import {
  approveGuestPass,
  issueGuestPass,
  listGuestPasses,
  redeemGuestPass,
  revokeGuestPass,
} from "./guest-pass-runtime-service";

export const commerceSettingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) =>
    getCommerceSettings(
      await requireCommerceSettingsAccess(ctx, "commerce.view"),
    ),
  ),
  createTaxRate: protectedProcedure
    .input(createTaxRateSchema)
    .mutation(async ({ ctx, input }) =>
      createTaxRate({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        values: input,
      }),
    ),
  updateTaxRate: protectedProcedure
    .input(updateTaxRateSchema)
    .mutation(async ({ ctx, input }) =>
      updateTaxRate({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  archiveTaxRate: protectedProcedure
    .input(archiveTaxRateSchema)
    .mutation(async ({ ctx, input }) =>
      archiveTaxRate({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  upsertTaxAssignment: protectedProcedure
    .input(upsertTaxAssignmentSchema)
    .mutation(async ({ ctx, input }) =>
      upsertTaxAssignment({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        values: input,
      }),
    ),
  archiveTaxAssignment: protectedProcedure
    .input(archiveTaxAssignmentSchema)
    .mutation(async ({ ctx, input }) =>
      archiveTaxAssignment({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  createRevenueCategory: protectedProcedure
    .input(createRevenueCategorySchema)
    .mutation(async ({ ctx, input }) =>
      createRevenueCategory({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        values: input,
      }),
    ),
  updateRevenueCategory: protectedProcedure
    .input(updateRevenueCategorySchema)
    .mutation(async ({ ctx, input }) =>
      updateRevenueCategory({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  archiveRevenueCategory: protectedProcedure
    .input(archiveRevenueCategorySchema)
    .mutation(async ({ ctx, input }) =>
      archiveRevenueCategory({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  createOfflinePaymentMethod: protectedProcedure
    .input(createOfflinePaymentMethodSchema)
    .mutation(async ({ ctx, input }) =>
      createOfflinePaymentMethod({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        values: input,
      }),
    ),
  updateOfflinePaymentMethod: protectedProcedure
    .input(updateOfflinePaymentMethodSchema)
    .mutation(async ({ ctx, input }) =>
      updateOfflinePaymentMethod({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  archiveOfflinePaymentMethod: protectedProcedure
    .input(archiveOfflinePaymentMethodSchema)
    .mutation(async ({ ctx, input }) =>
      archiveOfflinePaymentMethod({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  saveDocumentDefaults: protectedProcedure
    .input(saveDocumentDefaultsSchema)
    .mutation(async ({ ctx, input }) =>
      saveDocumentDefaults({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        values: input,
      }),
    ),
  versionGuestPassPolicy: protectedProcedure
    .input(versionGuestPassPolicySchema)
    .mutation(async ({ ctx, input }) =>
      versionGuestPassPolicy({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  listGuestPasses: protectedProcedure
    .input(listGuestPassesSchema)
    .query(async ({ ctx, input }) =>
      listGuestPasses({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.view"),
        ...input,
      }),
    ),
  issueGuestPass: protectedProcedure
    .input(issueGuestPassSchema)
    .mutation(async ({ ctx, input }) =>
      issueGuestPass({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  approveGuestPass: protectedProcedure
    .input(approveGuestPassSchema)
    .mutation(async ({ ctx, input }) =>
      approveGuestPass({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  redeemGuestPass: protectedProcedure
    .input(redeemGuestPassSchema)
    .mutation(async ({ ctx, input }) =>
      redeemGuestPass({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
  revokeGuestPass: protectedProcedure
    .input(revokeGuestPassSchema)
    .mutation(async ({ ctx, input }) =>
      revokeGuestPass({
        scope: await requireCommerceSettingsAccess(ctx, "commerce.manage"),
        actorUserId: ctx.auth.user.id,
        ...input,
      }),
    ),
});
