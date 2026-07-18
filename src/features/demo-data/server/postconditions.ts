import "server-only";

import { and, count, eq, gte, inArray, isNotNull, min } from "drizzle-orm";

import {
  accessControlIntegration,
  cancellationCharge,
  cancellationCreditAllocation,
  cancellationPolicy,
  client,
  externalChannelIntegration,
  giftCard,
  marketplaceListing,
  providerAccount,
  publicationTarget,
  studioBooking,
  studioBookingPayment,
  studioClass,
  studioPayment,
  workoutProgram,
} from "@/db/schema";
import type {
  DemoRecordRef,
  DemoDataTransaction,
  DemoSeedContext,
} from "@/features/demo-data/server/types";
import { assertDemoRecoveryPostconditions } from "@/features/demo-data/server/recovery-postconditions";

function hasDisabledSubmissionMode(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>).submissionMode === "DISABLED";
}

export async function assertDemoRunPostconditions(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  records: readonly DemoRecordRef[],
): Promise<void> {
  const ids = (...recordTypes: string[]): string[] =>
    records
      .filter((record) => recordTypes.includes(record.recordType))
      .map((record) => record.recordId);
  const clientIds = ids("Client");
  const paymentIds = ids("StudioPayment");
  const classIds = ids("StudioClass");
  const bookingIds = ids("StudioBooking");
  const clientRows = await tx
    .select({ value: count() })
    .from(client)
    .where(inArray(client.id, clientIds));
  const paymentRows = await tx
    .select({ value: count() })
    .from(studioPayment)
    .where(inArray(studioPayment.id, paymentIds));
  const classRows = await tx
    .select({ earliest: min(studioClass.startTime), value: count() })
    .from(studioClass)
    .where(inArray(studioClass.id, classIds));
  const futureAttendanceRows = await tx
    .select({ value: count() })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
    .where(
      and(
        eq(studioClass.organizationId, context.organizationId),
        eq(studioClass.locationId, context.locationId),
        inArray(studioBooking.id, bookingIds),
        gte(studioClass.startTime, context.referenceDate),
        isNotNull(studioBooking.checkedInAt),
      ),
    );
  const bookingPaymentRows = await tx
    .select({ value: count() })
    .from(studioBookingPayment)
    .where(inArray(studioBookingPayment.id, ids("StudioBookingPayment")));
  const providers = await tx
    .select({
      encryptedSecret: providerAccount.encryptedSecret,
      encryptedWebhookSecret: providerAccount.encryptedWebhookSecret,
      status: providerAccount.status,
    })
    .from(providerAccount)
    .where(inArray(providerAccount.id, ids("providers")));
  const publicationTargets = await tx
    .select({
      channelConfig: publicationTarget.channelConfig,
      kind: publicationTarget.kind,
      status: publicationTarget.status,
    })
    .from(publicationTarget)
    .where(
      inArray(
        publicationTarget.id,
        ids("publicationTargets", "PublicationTarget"),
      ),
    );
  const externalChannels = await tx
    .select({
      credentials: externalChannelIntegration.credentials,
      externalAccountId: externalChannelIntegration.externalAccountId,
      status: externalChannelIntegration.status,
    })
    .from(externalChannelIntegration)
    .where(
      inArray(
        externalChannelIntegration.id,
        ids("ExternalChannelIntegration"),
      ),
    );
  const accessIntegrations = await tx
    .select({
      credentials: accessControlIntegration.credentials,
      status: accessControlIntegration.status,
    })
    .from(accessControlIntegration)
    .where(
      inArray(accessControlIntegration.id, ids("AccessControlIntegration")),
    );
  const giftCards = await tx
    .select({
      stripePaymentIntentId: giftCard.stripePaymentIntentId,
    })
    .from(giftCard)
    .where(inArray(giftCard.id, ids("GiftCard")));
  const cancellationPolicies = await tx
    .select({
      chargeCard: cancellationPolicy.chargeCard,
      sendNotification: cancellationPolicy.sendNotification,
    })
    .from(cancellationPolicy)
    .where(inArray(cancellationPolicy.id, ids("CancellationPolicy")));
  const cancellationCharges = await tx
    .select({
      id: cancellationCharge.id,
      creditsDeducted: cancellationCharge.creditsDeducted,
      status: cancellationCharge.status,
      waived: cancellationCharge.waived,
      stripeChargeId: cancellationCharge.stripeChargeId,
      stripeConnectionId: cancellationCharge.stripeConnectionId,
      stripePaymentIntentId: cancellationCharge.stripePaymentIntentId,
      commerceOperationId: cancellationCharge.commerceOperationId,
    })
    .from(cancellationCharge)
    .where(inArray(cancellationCharge.id, ids("CancellationCharge")));
  const cancellationAllocations = await tx
    .select({
      cancellationChargeId: cancellationCreditAllocation.cancellationChargeId,
      credits: cancellationCreditAllocation.credits,
    })
    .from(cancellationCreditAllocation)
    .where(
      inArray(
        cancellationCreditAllocation.id,
        ids("CancellationCreditAllocation"),
      ),
    );
  const marketplaceListings = await tx
    .select({
      status: marketplaceListing.status,
    })
    .from(marketplaceListing)
    .where(inArray(marketplaceListing.id, ids("MarketplaceListing")));
  const workoutPrograms = await tx
    .select({
      isPublished: workoutProgram.isPublished,
    })
    .from(workoutProgram)
    .where(inArray(workoutProgram.id, ids("WorkoutProgram")));
  if (clientRows[0]?.value !== context.profileConfig.clientCount) {
    throw new Error("Demo client count did not match the selected profile.");
  }
  if (paymentRows[0]?.value !== context.profileConfig.paymentsCount) {
    throw new Error("Demo payment count did not match the selected profile.");
  }
  const minimumClasses = context.profile === "QA_EXHAUSTIVE" ? 1_000 : 300;
  if ((classRows[0]?.value ?? 0) < minimumClasses) {
    throw new Error(
      "Demo schedule did not meet the profile density requirement.",
    );
  }
  const oldestAllowed = new Date(
    context.referenceDate.getTime() - 700 * 86_400_000,
  );
  if (!classRows[0]?.earliest || classRows[0].earliest > oldestAllowed) {
    throw new Error("Demo schedule does not cover long-range analytics.");
  }
  if ((futureAttendanceRows[0]?.value ?? 0) > 0) {
    throw new Error("Future demo bookings must never contain attendance.");
  }
  if ((bookingPaymentRows[0]?.value ?? 0) === 0) {
    throw new Error("Demo class revenue requires booking/payment attribution.");
  }
  if (
    providers.some(
      (row) =>
        row.status !== "DISCONNECTED" ||
        row.encryptedSecret ||
        row.encryptedWebhookSecret,
    )
  ) {
    throw new Error(
      "Demo provider accounts must remain disconnected and secret-free.",
    );
  }
  if (
    publicationTargets.some(
      (row) =>
        row.status === "PUBLISHED" ||
        (row.kind === "FORM" && !hasDisabledSubmissionMode(row.channelConfig)),
    )
  ) {
    throw new Error(
      "Demo publication targets must remain paused and form submission must be disabled.",
    );
  }
  if (
    externalChannels.some(
      (row) =>
        !["DRAFT", "PAUSED"].includes(row.status) ||
        row.credentials ||
        row.externalAccountId,
    )
  ) {
    throw new Error(
      "Demo sales channels must remain inactive and credential-free.",
    );
  }
  if (
    accessIntegrations.some(
      (row) => !["DRAFT", "PAUSED"].includes(row.status) || row.credentials,
    )
  ) {
    throw new Error(
      "Demo access integrations must remain inactive and credential-free.",
    );
  }
  if (giftCards.some((row) => row.stripePaymentIntentId)) {
    throw new Error("Demo gift cards must not reference Stripe objects.");
  }
  if (
    cancellationPolicies.some((row) => row.chargeCard || row.sendNotification)
  ) {
    throw new Error(
      "Demo cancellation policies must not charge cards or send notifications.",
    );
  }
  if (
    cancellationCharges.some(
      (row) =>
        Boolean(
          row.stripeChargeId ||
          row.stripeConnectionId ||
          row.stripePaymentIntentId ||
          row.commerceOperationId,
        ) || (row.waived ? row.status !== "WAIVED" : row.status === "WAIVED"),
    )
  ) {
    throw new Error(
      "Demo cancellation charges must stay provider-free with consistent waiver state.",
    );
  }
  const allocatedCreditsByCharge = new Map<string, number>();
  for (const allocation of cancellationAllocations) {
    allocatedCreditsByCharge.set(
      allocation.cancellationChargeId,
      (allocatedCreditsByCharge.get(allocation.cancellationChargeId) ?? 0) +
        allocation.credits,
    );
  }
  if (
    cancellationAllocations.length === 0 ||
    cancellationCharges.some(
      (charge) =>
        charge.creditsDeducted !==
        (allocatedCreditsByCharge.get(charge.id) ?? 0),
    )
  ) {
    throw new Error(
      "Demo cancellation credit allocations must reconcile to each charge.",
    );
  }
  if (marketplaceListings.some((row) => row.status === "PUBLISHED")) {
    throw new Error("Demo marketplace listings must remain unpublished.");
  }
  if (workoutPrograms.some((row) => row.isPublished)) {
    throw new Error("Demo workout programmes must remain unpublished.");
  }
  await assertDemoRecoveryPostconditions(tx, context, records);
}
