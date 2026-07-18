import { TRPCError } from "@trpc/server";

import {
  reassignRecoverySchema,
  recoveryCaseIdSchema,
  recoveryCaseListInputSchema,
  recoveryPolicyUpdateSchema,
  resendRecoverySchema,
  retryRecoveryActionSchema,
} from "@/features/commerce/recovery-contracts";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { requirePaymentRecoveryAccess } from "./payment-recovery-access";
import {
  cancelPaymentRecoveryCase,
  reassignPaymentRecoveryCase,
  resendPaymentRecovery,
  retryPaymentRecoveryAction,
} from "./payment-recovery-mutation-service";
import {
  listPaymentRecoveryPolicies,
  versionPaymentRecoveryPolicy,
} from "./payment-recovery-policy-service";
import {
  getPaymentRecoveryCaseDetail,
  getPaymentRecoveryStats,
  listPaymentRecoveryCases,
  listPaymentRecoveryOwners,
} from "./payment-recovery-query-service";

export const paymentRecoveryRouter = createTRPCRouter({
  listPolicies: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requirePaymentRecoveryAccess(ctx, "commerce.view");
    return listPaymentRecoveryPolicies(scope);
  }),

  versionPolicy: protectedProcedure
    .input(recoveryPolicyUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requirePaymentRecoveryAccess(ctx, "commerce.manage");
      return versionPaymentRecoveryPolicy({
        scope,
        actorUserId: ctx.auth.user.id,
        policy: input,
      });
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requirePaymentRecoveryAccess(ctx, "commerce.view");
    return getPaymentRecoveryStats(scope);
  }),

  listCases: protectedProcedure
    .input(recoveryCaseListInputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await requirePaymentRecoveryAccess(ctx, "commerce.view");
      return listPaymentRecoveryCases(scope, input);
    }),

  getCase: protectedProcedure
    .input(recoveryCaseIdSchema)
    .query(async ({ ctx, input }) => {
      const scope = await requirePaymentRecoveryAccess(ctx, "commerce.view");
      const detail = await getPaymentRecoveryCaseDetail(scope, input.caseId);
      if (!detail.recoveryCase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recovery case was not found.",
        });
      }
      return { ...detail, recoveryCase: detail.recoveryCase };
    }),

  listOwners: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requirePaymentRecoveryAccess(ctx, "commerce.view");
    return listPaymentRecoveryOwners(scope);
  }),

  retryAction: protectedProcedure
    .input(retryRecoveryActionSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requirePaymentRecoveryAccess(ctx, "commerce.manage");
      return retryPaymentRecoveryAction({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  resend: protectedProcedure
    .input(resendRecoverySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requirePaymentRecoveryAccess(ctx, "commerce.manage");
      return resendPaymentRecovery({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  reassign: protectedProcedure
    .input(reassignRecoverySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requirePaymentRecoveryAccess(ctx, "commerce.manage");
      return reassignPaymentRecoveryCase({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  cancel: protectedProcedure
    .input(recoveryCaseIdSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requirePaymentRecoveryAccess(ctx, "commerce.manage");
      return cancelPaymentRecoveryCase({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),
});
