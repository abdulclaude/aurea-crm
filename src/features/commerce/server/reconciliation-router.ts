import { TRPCError } from "@trpc/server";

import {
  listLedgerEntriesInputSchema,
  listReconciliationIssuesInputSchema,
  listReconciliationRunsInputSchema,
  listStripeEventsInputSchema,
  reconciliationIssueIdSchema,
  requestReconciliationRunInputSchema,
  resolveReconciliationIssueInputSchema,
} from "@/features/commerce/reconciliation-contracts";
import {
  acknowledgedIssueOutputSchema,
  ledgerPageOutputSchema,
  reconciliationIssuePageOutputSchema,
  reconciliationRunPageOutputSchema,
  requestedReconciliationRunSchema,
  resolvedIssueOutputSchema,
  stripeEventPageOutputSchema,
} from "@/features/commerce/reconciliation-output-contracts";
import { requestReceiptReconciliation } from "@/features/commerce/server/reconciliation-request";
import {
  acknowledgeReconciliationIssue,
  listLedgerEntries,
  listReconciliationIssues,
  listReconciliationRuns,
  listStripeEvents,
  resolveReconciliationIssue,
  type CommerceScope,
} from "@/features/commerce/server/reconciliation-service";
import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

async function authorizeCommerceScope(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
  capability: Capability;
}): Promise<CommerceScope> {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before viewing payment operations.",
    });
  }
  const scope = {
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
    capability: input.capability,
    resource: scope,
  });
  return scope;
}

export const commerceReconciliationRouter = createTRPCRouter({
  listLedgerEntries: protectedProcedure
    .input(listLedgerEntriesInputSchema)
    .output(ledgerPageOutputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await authorizeCommerceScope({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.view",
      });
      return listLedgerEntries(scope, input);
    }),

  listStripeEvents: protectedProcedure
    .input(listStripeEventsInputSchema)
    .output(stripeEventPageOutputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await authorizeCommerceScope({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.view",
      });
      return listStripeEvents(scope, input);
    }),

  listRuns: protectedProcedure
    .input(listReconciliationRunsInputSchema)
    .output(reconciliationRunPageOutputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await authorizeCommerceScope({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.view",
      });
      return listReconciliationRuns(scope, input);
    }),

  listIssues: protectedProcedure
    .input(listReconciliationIssuesInputSchema)
    .output(reconciliationIssuePageOutputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await authorizeCommerceScope({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.view",
      });
      return listReconciliationIssues(scope, input);
    }),

  requestRun: protectedProcedure
    .input(requestReconciliationRunInputSchema)
    .output(requestedReconciliationRunSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await authorizeCommerceScope({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.reconcile",
      });
      return requestReceiptReconciliation({
        scope,
        actorId: ctx.auth.user.id,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
      });
    }),

  acknowledgeIssue: protectedProcedure
    .input(reconciliationIssueIdSchema)
    .output(acknowledgedIssueOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await authorizeCommerceScope({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.reconcile",
      });
      return acknowledgeReconciliationIssue({
        scope,
        issueId: input.id,
        actorId: ctx.auth.user.id,
      });
    }),

  resolveIssue: protectedProcedure
    .input(resolveReconciliationIssueInputSchema)
    .output(resolvedIssueOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await authorizeCommerceScope({
        userId: ctx.auth.user.id,
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        capability: "commerce.reconcile",
      });
      return resolveReconciliationIssue({
        scope,
        issueId: input.id,
        actorId: ctx.auth.user.id,
        resolutionNote: input.resolutionNote,
      });
    }),
});
