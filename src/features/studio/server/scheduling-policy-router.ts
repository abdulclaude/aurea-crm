import {
  archiveSchedulingPolicySchema,
  assignSchedulingPoliciesSchema,
  createBookingWindowPolicySchema,
  createWaitlistPolicySchema,
  previewSchedulingPoliciesSchema,
  rollbackSchedulingPolicySchema,
  schedulingPolicyHistorySchema,
  setSchedulingPolicyDefaultSchema,
  versionBookingWindowPolicySchema,
  versionWaitlistPolicySchema,
} from "@/features/studio/scheduling/contracts";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { requireSchedulingPolicyAccess } from "./scheduling-policy-access";
import {
  archiveSchedulingPolicy,
  assignSchedulingPolicies,
  setSchedulingPolicyDefault,
} from "./scheduling-policy-management-service";
import {
  listSchedulingPolicies,
  listSchedulingPolicyHistory,
} from "./scheduling-policy-query-service";
import { previewSchedulingPolicies } from "./scheduling-policy-preview-service";
import {
  createBookingWindowPolicy,
  createWaitlistPolicy,
  rollbackBookingWindowPolicy,
  rollbackWaitlistPolicy,
  versionBookingWindowPolicy,
  versionWaitlistPolicy,
} from "./scheduling-policy-version-service";

export const schedulingPolicyRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireSchedulingPolicyAccess(ctx, "settings.view");
    return listSchedulingPolicies(scope);
  }),

  listForClass: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireSchedulingPolicyAccess(ctx, "schedule.view");
    return listSchedulingPolicies(scope);
  }),

  history: protectedProcedure
    .input(schedulingPolicyHistorySchema)
    .query(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.view");
      return listSchedulingPolicyHistory(scope, input.kind, input.policyId);
    }),

  preview: protectedProcedure
    .input(previewSchedulingPoliciesSchema)
    .query(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.view");
      return previewSchedulingPolicies({ scope, ...input });
    }),

  previewForClass: protectedProcedure
    .input(previewSchedulingPoliciesSchema)
    .query(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "schedule.view");
      return previewSchedulingPolicies({ scope, ...input });
    }),

  createBookingWindow: protectedProcedure
    .input(createBookingWindowPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      return createBookingWindowPolicy({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  createWaitlist: protectedProcedure
    .input(createWaitlistPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      return createWaitlistPolicy({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  versionBookingWindow: protectedProcedure
    .input(versionBookingWindowPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      return versionBookingWindowPolicy({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  versionWaitlist: protectedProcedure
    .input(versionWaitlistPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      return versionWaitlistPolicy({
        scope,
        actorUserId: ctx.auth.user.id,
        ...input,
      });
    }),

  rollback: protectedProcedure
    .input(rollbackSchedulingPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      const request = {
        scope,
        actorUserId: ctx.auth.user.id,
        policyId: input.policyId,
        targetVersion: input.targetVersion,
        expectedVersion: input.expectedVersion,
        effectiveFrom: input.effectiveFrom,
        changeNote: input.changeNote,
      };
      return input.kind === "BOOKING_WINDOW"
        ? rollbackBookingWindowPolicy(request)
        : rollbackWaitlistPolicy(request);
    }),

  setDefault: protectedProcedure
    .input(setSchedulingPolicyDefaultSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      return setSchedulingPolicyDefault({ scope, ...input });
    }),

  archive: protectedProcedure
    .input(archiveSchedulingPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      return archiveSchedulingPolicy({ scope, ...input });
    }),

  assignToService: protectedProcedure
    .input(assignSchedulingPoliciesSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireSchedulingPolicyAccess(ctx, "settings.manage");
      return assignSchedulingPolicies({ scope, ...input });
    }),
});
