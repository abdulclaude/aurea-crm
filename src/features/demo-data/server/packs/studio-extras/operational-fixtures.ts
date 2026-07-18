import {
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import type {
  OperationalBooking,
  OperationalClass,
  OperationalFixtures,
  StudioExtrasFixturePlan,
  StudioExtrasDependencies,
} from "@/features/demo-data/server/packs/studio-extras/types";

const DAY_MS = 86_400_000;

export function buildOperationalFixtures(
  context: DemoSeedContext,
  dependencies: StudioExtrasDependencies,
  plan: Pick<StudioExtrasFixturePlan, "cancellationPolicies" | "roomLayouts" | "spots">,
  source: {
    classes: readonly OperationalClass[];
    bookings: readonly OperationalBooking[];
  },
): OperationalFixtures {
  const qa = context.profile === "QA_EXHAUSTIVE";
  const now = context.referenceDate;
  const layoutByRoom = new Map(plan.roomLayouts.map((layout) => [layout.roomId, layout.id]));
  const activeSpotsByLayout = new Map<string, Array<{ id: string }>>();
  for (const item of plan.spots) {
    if (!item.isActive || item.type === "INSTRUCTOR" || item.type === "BLOCKED") continue;
    const existing = activeSpotsByLayout.get(item.layoutId) ?? [];
    existing.push({ id: item.id });
    activeSpotsByLayout.set(item.layoutId, existing);
  }

  const usedClassSpot = new Set<string>();
  const usedBookings = new Set<string>();
  const spotBookings = source.bookings.flatMap((booking, index) => {
    if (!booking.roomId || !["BOOKED", "ATTENDED"].includes(booking.status)) return [];
    if (usedBookings.has(booking.id)) return [];
    const layoutId = layoutByRoom.get(booking.roomId);
    if (!layoutId) return [];
    const roomSpots = activeSpotsByLayout.get(layoutId) ?? [];
    const selected = roomSpots.find((candidate) => !usedClassSpot.has(`${booking.classId}:${candidate.id}`));
    if (!selected) return [];
    usedBookings.add(booking.id);
    usedClassSpot.add(`${booking.classId}:${selected.id}`);
    return [{
      id: deterministicDemoId(context.runId, "spot-booking", index),
      spotId: selected.id,
      bookingId: booking.id,
      clientId: booking.clientId,
      classId: booking.classId,
      createdAt: now,
    }];
  }).slice(0, qa ? 160 : 45);

  const chargeCandidates = source.bookings.filter(
    (booking) => booking.status === "LATE_CANCEL" || booking.status === "NO_SHOW",
  );
  const cancellationCharges = chargeCandidates.slice(0, qa ? 80 : 24).map((booking, index) => {
    const noShow = booking.status === "NO_SHOW";
    const waived = index % 7 === 0;
    const requiresPaymentMethod = !waived && index % 5 === 1;
    const failed = !waived && index % 5 === 2;
    const policy = plan.cancellationPolicies[index % plan.cancellationPolicies.length];
    const status = waived
      ? ("WAIVED" as const)
      : requiresPaymentMethod
        ? ("REQUIRES_PAYMENT_METHOD" as const)
        : failed
          ? ("FAILED" as const)
          : ("PENDING" as const);
    return {
      id: deterministicDemoId(context.runId, "cancellation-charge", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      clientId: booking.clientId,
      classId: booking.classId,
      bookingId: booking.id,
      policyId: policy.id,
      type: noShow ? ("NO_SHOW" as const) : ("LATE_CANCEL" as const),
      status,
      amount: noShow ? policy.noShowFeeAmount : policy.lateCancelFee,
      currency: context.currency,
      creditsDeducted: 0,
      waived,
      waivedBy: waived ? context.actorUserId : null,
      waivedReason: waived ? "Synthetic demo goodwill waiver" : null,
      stripeChargeId: null,
      failureCode: requiresPaymentMethod
        ? "CUSTOMER_NOT_LINKED"
        : failed
          ? "STRIPE_CONNECTION_UNAVAILABLE"
          : null,
      failureMessage: requiresPaymentMethod
        ? "Synthetic demo member has no saved payment method."
        : failed
          ? "Synthetic demo workspace has no active payment connection."
          : null,
      createdAt: new Date(now.getTime() - (1 + index) * DAY_MS),
      processedAt:
        waived || requiresPaymentMethod || failed
          ? new Date(now.getTime() - (1 + index) * DAY_MS)
          : null,
      updatedAt: now,
    };
  });

  const futureClasses = source.classes.filter((item) => item.startTime > now && item.instructorId);
  const substitutionCount = Math.min(futureClasses.length, qa ? 20 : 8);
  const statuses = ["OPEN", "OFFERED", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"] as const;
  const substitutions = futureClasses.slice(0, substitutionCount).map((item, index) => {
    const status = statuses[index % statuses.length];
    const currentInstructorId = item.instructorId as string;
    const alternate = dependencies.catalog.instructors.find(
      (instructor) => instructor.id !== currentInstructorId,
    )?.id ?? currentInstructorId;
    const accepted = status === "ACCEPTED";
    const declined = status === "DECLINED";
    return {
      id: deterministicDemoId(context.runId, "substitution-request", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      classId: item.id,
      originalInstructorId: accepted ? alternate : currentInstructorId,
      substituteId: accepted ? currentInstructorId : status === "OPEN" ? null : alternate,
      status,
      reason: ["Illness", "Training commitment", "Family appointment", "Travel disruption"][index % 4],
      requestedAt: new Date(now.getTime() - (index + 1) * DAY_MS),
      acceptedAt: accepted ? new Date(now.getTime() - index * DAY_MS) : null,
      declinedAt: declined ? new Date(now.getTime() - index * DAY_MS) : null,
      expiresAt:
        status === "EXPIRED"
          ? new Date(now.getTime() - DAY_MS)
          : new Date(item.startTime.getTime() - 2 * 60 * 60_000),
      notes: "Synthetic demo request; no notification was sent.",
      createdAt: new Date(now.getTime() - (index + 1) * DAY_MS),
      updatedAt: now,
    };
  });

  return { cancellationCharges, spotBookings, substitutions };
}
