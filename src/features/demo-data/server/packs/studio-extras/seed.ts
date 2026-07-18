import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  accessControlIntegration,
  cancellationCharge,
  cancellationPolicy,
  clientAccountBalance,
  clientAccountCreditTransaction,
  dynamicPricingRule,
  externalChannelIntegration,
  giftCard,
  instructorSubstitutionRequest,
  instructorPayout,
  marketplaceListing,
  performanceMetric,
  publicationTarget,
  publicationVersion,
  promoCode,
  roomLayout,
  spot,
  spotBooking,
  soapNote,
  studioBooking,
  studioClass,
  studioPayment,
  studioPaymentPlan,
  waiverSignature,
  waiverTemplate,
  videoOnDemandAsset,
  widgetConfig,
  workoutProgram,
} from "@/db/schema";
import { buildStudioExtrasFixturePlan } from "@/features/demo-data/server/packs/studio-extras/build-plan";
import {
  assertOperationalFixtures,
  assertStudioExtrasFixturePlan,
} from "@/features/demo-data/server/packs/studio-extras/invariants";
import { buildOperationalFixtures } from "@/features/demo-data/server/packs/studio-extras/operational-fixtures";
import { seedCancellationCreditAllocations } from "@/features/demo-data/server/packs/studio-extras/cancellation-credit-fixtures";
import type {
  OperationalBooking,
  StudioExtrasDependencies,
  StudioExtrasPackOutput,
} from "@/features/demo-data/server/packs/studio-extras/types";
import {
  recordRefs,
  type DemoDataTransaction,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";

export async function seedStudioExtrasPack(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  dependencies: StudioExtrasDependencies,
): Promise<StudioExtrasPackOutput> {
  const plan = buildStudioExtrasFixturePlan(context, dependencies);
  assertStudioExtrasFixturePlan(context, dependencies, plan);
  const [existingDefaultCancellationPolicy] = await tx
    .select({ id: cancellationPolicy.id })
    .from(cancellationPolicy)
    .where(
      and(
        eq(cancellationPolicy.organizationId, context.organizationId),
        eq(cancellationPolicy.locationId, context.locationId),
        eq(cancellationPolicy.isDefault, true),
        eq(cancellationPolicy.isActive, true),
      ),
    )
    .limit(1);
  if (existingDefaultCancellationPolicy) {
    plan.cancellationPolicies = plan.cancellationPolicies.map((policy) => ({
      ...policy,
      isDefault: false,
    }));
  }

  await tx.insert(promoCode).values(plan.promoCodes);
  await tx.insert(clientAccountBalance).values(plan.accountBalances);
  await tx.insert(clientAccountCreditTransaction).values(plan.accountTransactions);
  await tx.insert(giftCard).values(plan.giftCards);
  await tx.insert(dynamicPricingRule).values(plan.pricingRules);
  await tx.insert(studioPaymentPlan).values(plan.paymentPlans);
  await tx.insert(cancellationPolicy).values(plan.cancellationPolicies);
  await tx.insert(waiverTemplate).values(plan.waiverTemplates);
  await tx.insert(waiverSignature).values(plan.waiverSignatures);
  await tx.insert(roomLayout).values(plan.roomLayouts);
  await tx.insert(spot).values(plan.spots);
  await tx.insert(videoOnDemandAsset).values(plan.videoOnDemandAssets);
  if (plan.pricingPublicationTargets.length > 0) {
    await tx.insert(publicationTarget).values(
      plan.pricingPublicationTargets.map((target) => ({
        ...target,
        publishedVersionId: null,
      })),
    );
    await tx.insert(publicationVersion).values(plan.pricingPublicationVersions);
    for (const target of plan.pricingPublicationTargets) {
      await tx
        .update(publicationTarget)
        .set({ publishedVersionId: target.publishedVersionId })
        .where(
          and(
            eq(publicationTarget.id, target.id),
            eq(publicationTarget.organizationId, context.organizationId),
            eq(publicationTarget.locationId, context.locationId),
          ),
        );
    }
  }
  await tx.insert(widgetConfig).values(plan.widgets);
  await tx.insert(publicationTarget).values(plan.widgetPublicationTargets);
  await tx.insert(externalChannelIntegration).values(plan.channels);
  await tx.insert(accessControlIntegration).values(plan.accessIntegrations);
  await tx.insert(marketplaceListing).values(plan.marketplaceListings);
  await tx.insert(performanceMetric).values(plan.performanceMetrics);
  await tx.insert(workoutProgram).values(plan.workoutPrograms);
  await tx.insert(soapNote).values(plan.soapNotes);
  await tx.insert(instructorPayout).values(plan.instructorPayouts);

  const demoClassScope = and(
    eq(studioClass.organizationId, context.organizationId),
    eq(studioClass.locationId, context.locationId),
    sql`${studioClass.metadata} ->> 'demoRunId' = ${context.runId}`,
  );
  await tx
    .update(studioClass)
    .set({
      cancellationPolicyId: plan.cancellationPolicies[0].id,
      cancellationWindowHours: plan.cancellationPolicies[0].lateCancelWindow,
      updatedAt: context.referenceDate,
    })
    .where(demoClassScope);

  const layoutRoomIds = plan.roomLayouts.map(({ roomId }) => roomId);
  if (layoutRoomIds.length > 0) {
    await tx
      .update(studioClass)
      .set({ spotPickingEnabled: true, updatedAt: context.referenceDate })
      .where(and(demoClassScope, inArray(studioClass.roomId, layoutRoomIds)));
  }

  const queriedClasses = await tx
    .select({
      id: studioClass.id,
      instructorId: studioClass.instructorId,
      roomId: studioClass.roomId,
      startTime: studioClass.startTime,
    })
    .from(studioClass)
    .where(demoClassScope)
    .orderBy(desc(studioClass.startTime))
    .limit(context.profile === "QA_EXHAUSTIVE" ? 500 : 220);

  const bookingScope = and(
    eq(studioClass.organizationId, context.organizationId),
    eq(studioClass.locationId, context.locationId),
    sql`${studioClass.metadata} ->> 'demoRunId' = ${context.runId}`,
  );
  const spotSource = await tx
    .select({
      id: studioBooking.id,
      classId: studioBooking.classId,
      clientId: studioBooking.clientId,
      roomId: studioClass.roomId,
      status: studioBooking.status,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
    .where(and(bookingScope, inArray(studioBooking.status, ["BOOKED", "ATTENDED"])))
    .orderBy(desc(studioBooking.bookedAt))
    .limit(context.profile === "QA_EXHAUSTIVE" ? 1_200 : 400);
  const cancellationSource = await tx
    .select({
      id: studioBooking.id,
      classId: studioBooking.classId,
      clientId: studioBooking.clientId,
      roomId: studioClass.roomId,
      status: studioBooking.status,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
    .where(and(bookingScope, inArray(studioBooking.status, ["NO_SHOW", "LATE_CANCEL"])))
    .orderBy(desc(studioBooking.bookedAt))
    .limit(context.profile === "QA_EXHAUSTIVE" ? 100 : 30);

  const operational = buildOperationalFixtures(
    context,
    dependencies,
    plan,
    {
      classes: queriedClasses,
      bookings: [...spotSource, ...cancellationSource] as OperationalBooking[],
    },
  );
  assertOperationalFixtures(operational);
  if (operational.cancellationCharges.length > 0) {
    await tx.insert(cancellationCharge).values(operational.cancellationCharges);
  }
  const cancellationCreditAllocations = await seedCancellationCreditAllocations(
    tx,
    context,
    operational.cancellationCharges,
    plan.cancellationPolicies,
  );
  if (operational.spotBookings.length > 0) {
    await tx.insert(spotBooking).values(operational.spotBookings);
  }
  if (operational.substitutions.length > 0) {
    await tx.insert(instructorSubstitutionRequest).values(operational.substitutions);
  }

  await attachPromoRedemptions(tx, context, plan.promoCodes);

  const groups = [
    ["PromoCode", plan.promoCodes],
    ["ClientAccountBalance", plan.accountBalances],
    ["ClientAccountCreditTransaction", plan.accountTransactions],
    ["GiftCard", plan.giftCards],
    ["DynamicPricingRule", plan.pricingRules],
    ["StudioPaymentPlan", plan.paymentPlans],
    ["CancellationPolicy", plan.cancellationPolicies],
    ["WaiverTemplate", plan.waiverTemplates],
    ["WaiverSignature", plan.waiverSignatures],
    ["RoomLayout", plan.roomLayouts],
    ["Spot", plan.spots],
    ["VideoOnDemandAsset", plan.videoOnDemandAssets],
    [
      "PublicationTarget",
      [...plan.pricingPublicationTargets, ...plan.widgetPublicationTargets],
    ],
    ["PublicationVersion", plan.pricingPublicationVersions],
    ["WidgetConfig", plan.widgets],
    ["ExternalChannelIntegration", plan.channels],
    ["AccessControlIntegration", plan.accessIntegrations],
    ["MarketplaceListing", plan.marketplaceListings],
    ["PerformanceMetric", plan.performanceMetrics],
    ["WorkoutProgram", plan.workoutPrograms],
    ["SoapNote", plan.soapNotes],
    ["InstructorPayout", plan.instructorPayouts],
    ["CancellationCharge", operational.cancellationCharges],
    ["CancellationCreditAllocation", cancellationCreditAllocations],
    ["SpotBooking", operational.spotBookings],
    ["InstructorSubstitutionRequest", operational.substitutions],
  ] as const;
  return {
    counts: Object.fromEntries(groups.map(([name, rows]) => [name, rows.length])),
    records: groups.flatMap(([name, rows]) => recordRefs(name, rows)),
    promoCodes: plan.promoCodes.map(({ id, code }) => ({ id, code })),
    widgets: plan.widgets.map(({ id, name }) => ({ id, name })),
  };
}

async function attachPromoRedemptions(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
  promos: ReadonlyArray<{ id: string; isActive?: boolean | null }>,
): Promise<void> {
  const activePromos = promos.filter(({ isActive }) => isActive !== false);
  const redemptionTarget = context.profile === "QA_EXHAUSTIVE" ? 8 : 4;
  const payments = await tx
    .select({ id: studioPayment.id })
    .from(studioPayment)
    .where(
      and(
        eq(studioPayment.organizationId, context.organizationId),
        eq(studioPayment.locationId, context.locationId),
        eq(studioPayment.status, "SUCCEEDED"),
        isNull(studioPayment.promoCodeId),
        sql`coalesce(${studioPayment.discountAmount}, 0) > 0`,
        sql`${studioPayment.metadata} ->> 'demoRunId' = ${context.runId}`,
      ),
    )
    .orderBy(desc(studioPayment.createdAt))
    .limit(activePromos.length * redemptionTarget);
  const assignments = payments.map((payment, index) => ({
    paymentId: payment.id,
    promoId: activePromos[index % activePromos.length].id,
  }));
  if (assignments.length === 0) return;

  const assignmentValues = sql.join(
    assignments.map((item) => sql`(${item.paymentId}, ${item.promoId})`),
    sql`, `,
  );
  await tx.execute(sql`
    update "StudioPayment" as payment
    set "promoCodeId" = assignment.promo_id
    from (values ${assignmentValues}) as assignment(payment_id, promo_id)
    where payment.id = assignment.payment_id
      and payment."organizationId" = ${context.organizationId}
      and payment."locationId" = ${context.locationId}
  `);

  const counts = new Map<string, number>();
  for (const assignment of assignments) {
    counts.set(assignment.promoId, (counts.get(assignment.promoId) ?? 0) + 1);
  }
  const countValues = sql.join(
    [...counts].map(([id, count]) => sql`(${id}, ${count})`),
    sql`, `,
  );
  await tx.execute(sql`
    update "PromoCode" as promo
    set "redemptionCount" = tally.redemptions::integer,
        "updatedAt" = ${context.referenceDate.toISOString()}::timestamp
    from (values ${countValues}) as tally(promo_id, redemptions)
    where promo.id = tally.promo_id::text
      and promo."organizationId" = ${context.organizationId}
      and promo."locationId" = ${context.locationId}
  `);
}
