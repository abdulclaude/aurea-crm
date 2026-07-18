import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { cancellationPolicy, studioClass } from "@/db/schema";
import {
  CANCELLATION_CHARGE_STATUSES,
  cancellationChargeCanCollect,
} from "@/features/studio/lib/cancellation-charge-rules";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import {
  exactCancellationLocation,
  requireCancellationAccess,
} from "./cancellation-access";
import { enqueueCancellationCollections } from "./cancellation-collection-enqueue";
import { applyCancellationOutcome } from "./cancellation-outcome-service";
import {
  cancellationPolicyCreateSchema,
  cancellationPolicyUpdateSchema,
  normalizeCancellationCurrency,
  normalizeCancellationMoney,
} from "./cancellation-policy-input";
import {
  getCancellationChargesPage,
  getCancellationOutcomePolicyPreview,
  listAssignableCancellationPolicies,
  listCancellationPolicies,
} from "./cancellation-policy-queries";
import { waiveCancellationCharge } from "./cancellation-waiver-service";
import {
  applySingleCancellationCharge,
  clearDefaultCancellationPolicies,
  dispatchCancellationOutcomeWorkflows,
  findScopedCancellationCharge,
  findScopedCancellationPolicy,
  notFoundCancellationCharge,
  notFoundCancellationPolicy,
} from "./cancellation-policy-router-helpers";

const outcomeInput = z.object({
  bookingIds: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(["NO_SHOW", "LATE_CANCEL"]),
});

const chargeCursorSchema = z.object({
  at: z.coerce.date(),
  id: z.string().min(1),
});

export const cancellationPolicyRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCancellationAccess(ctx, "commerce.view");
    return listCancellationPolicies(scope);
  }),

  listAssignable: protectedProcedure.query(async ({ ctx }) => {
    const scope = await requireCancellationAccess(ctx, "commerce.view");
    return listAssignableCancellationPolicies(scope);
  }),

  getOutcomePolicyPreview: protectedProcedure
    .input(z.object({ classId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "attendance.manage");
      return getCancellationOutcomePolicyPreview(scope, input.classId);
    }),

  create: protectedProcedure
    .input(cancellationPolicyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "commerce.manage");
      const currency = normalizeCancellationCurrency(input.currency);
      const now = new Date();
      return db.transaction(async (tx) => {
        if (input.isDefault) {
          await clearDefaultCancellationPolicies(tx, scope, now);
        }
        const [created] = await tx
          .insert(cancellationPolicy)
          .values({
            ...input,
            id: createId(),
            organizationId: scope.organizationId,
            locationId: scope.locationId,
            currency,
            noShowFeeAmount: normalizeCancellationMoney(
              input.noShowFeeAmount,
              currency,
            ),
            lateCancelFee: normalizeCancellationMoney(
              input.lateCancelFee,
              currency,
            ),
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        if (!created) throw new Error("Cancellation policy was not created");
        return created;
      });
    }),

  update: protectedProcedure
    .input(cancellationPolicyUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "commerce.manage");
      const existing = await findScopedCancellationPolicy(scope, input.id);
      if (!existing) notFoundCancellationPolicy();
      if (input.isDefault === true && input.isActive === false) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An inactive cancellation policy cannot be the default.",
        });
      }
      const currency = normalizeCancellationCurrency(
        input.currency ?? existing.currency,
      );
      const now = new Date();
      const { id, ...updates } = input;
      return db.transaction(async (tx) => {
        if (updates.isDefault)
          await clearDefaultCancellationPolicies(tx, scope, now);
        const [updated] = await tx
          .update(cancellationPolicy)
          .set({
            ...updates,
            currency,
            isDefault: updates.isActive === false ? false : updates.isDefault,
            noShowFeeAmount: normalizeCancellationMoney(
              updates.noShowFeeAmount ?? existing.noShowFeeAmount,
              currency,
            ),
            lateCancelFee: normalizeCancellationMoney(
              updates.lateCancelFee ?? existing.lateCancelFee,
              currency,
            ),
            updatedAt: now,
          })
          .where(
            and(
              eq(cancellationPolicy.id, id),
              eq(cancellationPolicy.organizationId, scope.organizationId),
              exactCancellationLocation(
                cancellationPolicy.locationId,
                scope.locationId,
              ),
            ),
          )
          .returning();
        if (!updated) notFoundCancellationPolicy();
        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "commerce.manage");
      const referenced = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClass.organizationId, scope.organizationId),
          exactCancellationLocation(studioClass.locationId, scope.locationId),
          eq(studioClass.cancellationPolicyId, input.id),
          gte(studioClass.startTime, new Date()),
        ),
        columns: { id: true },
      });
      if (referenced) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Reassign upcoming classes before archiving this policy.",
        });
      }
      const [archived] = await db
        .update(cancellationPolicy)
        .set({ isActive: false, isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(cancellationPolicy.id, input.id),
            eq(cancellationPolicy.organizationId, scope.organizationId),
            exactCancellationLocation(
              cancellationPolicy.locationId,
              scope.locationId,
            ),
          ),
        )
        .returning();
      if (!archived) notFoundCancellationPolicy();
      return archived;
    }),

  applyBookingOutcome: protectedProcedure
    .input(outcomeInput)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "attendance.manage");
      const result = await applyCancellationOutcome({
        ...scope,
        bookingIds: input.bookingIds,
        outcome: input.status,
      });
      await enqueueCancellationCollections(result.autoCollectChargeIds);
      await dispatchCancellationOutcomeWorkflows(
        scope.organizationId,
        input.status,
        result,
      );
      return { updated: result.updated };
    }),

  chargeNoShow: protectedProcedure
    .input(z.object({ bookingId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      applySingleCancellationCharge(ctx, input.bookingId, "NO_SHOW"),
    ),

  chargeLateCancel: protectedProcedure
    .input(z.object({ bookingId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      applySingleCancellationCharge(ctx, input.bookingId, "LATE_CANCEL"),
    ),

  collectCharge: protectedProcedure
    .input(z.object({ chargeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "commerce.manage");
      const charge = await findScopedCancellationCharge(scope, input.chargeId);
      if (!charge) notFoundCancellationCharge();
      if (!cancellationChargeCanCollect(charge.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This cancellation fee is not eligible for collection.",
        });
      }
      await enqueueCancellationCollections([charge.id]);
      return { queued: true, chargeId: charge.id };
    }),

  waiveCharge: protectedProcedure
    .input(
      z.object({
        chargeId: z.string().min(1),
        reason: z.string().trim().min(1).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "commerce.manage");
      return waiveCancellationCharge({
        ...scope,
        chargeId: input.chargeId,
        actorUserId: ctx.auth.user.id,
        reason: input.reason ?? null,
      });
    }),

  getCharges: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        classId: z.string().optional(),
        status: z.enum(CANCELLATION_CHARGE_STATUSES).optional(),
        cursor: chargeCursorSchema.optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = await requireCancellationAccess(ctx, "commerce.view");
      return getCancellationChargesPage(scope, input);
    }),
});
