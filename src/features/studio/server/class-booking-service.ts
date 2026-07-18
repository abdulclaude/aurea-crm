import "server-only";

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  bookingEntitlementAllocation,
  classCredit,
  client,
  commerceOperation,
  membershipPlan,
  pricingOption,
  pricingOptionAccessGrant,
  serviceType,
  studioBooking,
  studioClass,
  studioMembership,
} from "@/db/schema";
import type { CommerceTransaction } from "@/features/commerce/server/stripe/stripe-event-receipt";
import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  reserveWaitlistOfferForReleasedSeat,
  type WaitlistOffer,
} from "@/features/studio/server/waitlist-offer-service";

const PAYMENT_HOLD_MS = 60 * 60 * 1_000;
const MINIMUM_CHECKOUT_WINDOW_MS = 31 * 60 * 1_000;
export const occupiedStudioBookingStatuses = ["BOOKED", "ATTENDED"] as const;

type BookingChannel = "OPERATOR" | "MEMBER_PORTAL" | "API";

export type CreateClassBookingInput = {
  organizationId: string;
  locationId: string;
  classId: string;
  clientId: string;
  channel: BookingChannel;
  createdBy?: string | null;
  slidingScaleAmount?: string | null;
  now?: Date;
};

export type CreateClassBookingResult = {
  bookingId: string;
  classId: string;
  clientId: string;
  organizationId: string;
  locationId: string;
  created: boolean;
  requiresPayment: boolean;
  paymentStatus:
    | "NOT_REQUIRED"
    | "REQUIRES_PAYMENT"
    | "PROCESSING"
    | "PAID"
    | "FAILED"
    | "EXPIRED"
    | "REFUNDED";
  amount: string | null;
  currency: string | null;
  holdExpiresAt: Date | null;
  className: string;
  classStartTime: Date;
};

type ClassBookingScope = {
  organizationId: string;
  locationId: string;
  bookingId: string;
  channel: BookingChannel;
  cancelledBy?: string | null;
  now?: Date;
};

export type CancelClassBookingResult = {
  bookingId: string;
  classId: string;
  clientId: string;
  locationId: string;
  status: "CANCELLED" | "LATE_CANCEL";
  isLateCancellation: boolean;
  entitlementRestored: boolean;
  waitlistOffer: WaitlistOffer | null;
};

type LockedClass = {
  id: string;
  organizationId: string;
  locationId: string;
  name: string;
  startTime: Date;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  maxCapacity: number | null;
  onlineCapacity: number | null;
  onlineBookingEnabled: boolean;
  bookingWindowHours: number | null;
  cancellationWindowHours: number | null;
  bookingOpensMinutesBeforeStart: number | null;
  bookingClosesMinutesBeforeStart: number | null;
  cancellationsCloseMinutesBeforeStart: number | null;
  blockClientCancellations: boolean | null;
  resolvedBookingWindowPolicyVersionId: string | null;
  bookingWindowPolicySource:
    | "CLASS_OVERRIDE"
    | "SERVICE_TYPE"
    | "LOCATION_DEFAULT"
    | "ORGANIZATION_DEFAULT"
    | "LEGACY";
  pricingModel: "FREE" | "DROP_IN" | "PACKAGE_ONLY" | "SLIDING_SCALE";
  dropInPrice: string | null;
  slidingScaleMinPrice: string | null;
  slidingScaleMaxPrice: string | null;
  currency: string;
  classTypeId: string | null;
  serviceTypeId: string | null;
  serviceCategoryId: string | null;
  allowUnpaidBookings: boolean;
};

type Entitlement =
  | { source: "MEMBERSHIP_CREDIT"; membershipId: string; classCreditId: string }
  | {
      source: "MEMBERSHIP_ALLOWANCE";
      membershipId: string;
      classCreditId: null;
    }
  | {
      source: "FREE" | "UNPAID_ALLOWED";
      membershipId: null;
      classCreditId: null;
    }
  | null;

export async function createClassBooking(
  input: CreateClassBookingInput,
  transaction?: CommerceTransaction,
): Promise<CreateClassBookingResult> {
  if (transaction) {
    return createClassBookingInTransaction(transaction, input);
  }
  return db.transaction((tx) => createClassBookingInTransaction(tx, input));
}

async function createClassBookingInTransaction(
  tx: CommerceTransaction,
  input: CreateClassBookingInput,
): Promise<CreateClassBookingResult> {
  const now = input.now ?? new Date();
  await tx.execute(
    sql`SELECT id FROM "StudioClass" WHERE id = ${input.classId} FOR UPDATE`,
  );
  const targetClass = await getLockedClass(tx, input);
  validateClassAvailability(targetClass, input.channel, now);

  const [targetClient] = await tx
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        eq(client.id, input.clientId),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .limit(1);
  if (!targetClient) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
  }

  const [existing] = await tx
    .select({
      id: studioBooking.id,
      paymentStatus: studioBooking.paymentStatus,
      amount: studioBooking.amount,
      currency: studioBooking.currency,
      holdExpiresAt: studioBooking.holdExpiresAt,
    })
    .from(studioBooking)
    .where(
      and(
        eq(studioBooking.classId, input.classId),
        eq(studioBooking.clientId, input.clientId),
        inArray(studioBooking.status, occupiedStudioBookingStatuses),
      ),
    )
    .limit(1);
  if (existing) {
    return bookingResult(targetClass, input.clientId, existing, false);
  }

  const [capacity] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(studioBooking)
    .where(
      and(
        eq(studioBooking.classId, input.classId),
        inArray(studioBooking.status, occupiedStudioBookingStatuses),
      ),
    );
  const limit =
    input.channel === "OPERATOR"
      ? targetClass.maxCapacity
      : (targetClass.onlineCapacity ?? targetClass.maxCapacity);
  if (limit !== null && (capacity?.count ?? 0) >= limit) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Class is full. Consider joining the waitlist.",
    });
  }

  const entitlement = await allocateMembershipEntitlement({
    tx,
    targetClass,
    clientId: input.clientId,
    now,
  });
  const payment = resolvePaymentRequirement({
    targetClass,
    entitlement,
    slidingScaleAmount: input.slidingScaleAmount,
    now,
  });
  const bookingId = randomUUID();
  const [created] = await tx
    .insert(studioBooking)
    .values({
      id: bookingId,
      classId: input.classId,
      clientId: input.clientId,
      status: "BOOKED",
      bookedAt: now,
      paymentStatus: payment.requiresPayment
        ? "REQUIRES_PAYMENT"
        : "NOT_REQUIRED",
      amount: payment.amount,
      currency: payment.currency,
      holdExpiresAt: payment.holdExpiresAt,
      paymentRequiredAt: payment.requiresPayment ? now : null,
      confirmedAt: payment.requiresPayment ? null : now,
      bookingWindowPolicyVersionId:
        targetClass.resolvedBookingWindowPolicyVersionId,
      bookingWindowPolicySource: targetClass.bookingWindowPolicySource,
      selfCancellationBlocked: targetClass.blockClientCancellations ?? false,
      selfCancelClosesAt: new Date(
        targetClass.startTime.getTime() -
          (targetClass.cancellationsCloseMinutesBeforeStart ??
            (targetClass.cancellationWindowHours ?? 12) * 60) *
            60 *
            1_000,
      ),
      metadata: {
        bookingChannel: input.channel,
        classBookedWorkflowPending: !payment.requiresPayment,
      },
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: studioBooking.id,
      paymentStatus: studioBooking.paymentStatus,
      amount: studioBooking.amount,
      currency: studioBooking.currency,
      holdExpiresAt: studioBooking.holdExpiresAt,
    });
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create class booking",
    });
  }

  if (entitlement) {
    await tx.insert(bookingEntitlementAllocation).values({
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      bookingId,
      clientId: input.clientId,
      membershipId: entitlement.membershipId,
      classCreditId: entitlement.classCreditId,
      source: entitlement.source,
      status: "ACTIVE",
      quantity: 1,
      createdBy: input.createdBy,
      metadata: { bookingChannel: input.channel },
      allocatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  return bookingResult(targetClass, input.clientId, created, true);
}

export async function cancelClassBooking(
  input: ClassBookingScope,
  transaction?: CommerceTransaction,
): Promise<CancelClassBookingResult> {
  if (transaction) {
    return cancelClassBookingInTransaction(transaction, input);
  }
  return db.transaction((tx) => cancelClassBookingInTransaction(tx, input));
}

async function cancelClassBookingInTransaction(
  tx: CommerceTransaction,
  input: ClassBookingScope,
): Promise<CancelClassBookingResult> {
  const now = input.now ?? new Date();
  await tx.execute(
    sql`SELECT target_class.id
        FROM "StudioClass" AS target_class
        INNER JOIN "StudioBooking" AS target_booking
          ON target_booking."classId" = target_class.id
        WHERE target_booking.id = ${input.bookingId}
          AND target_class."organizationId" = ${input.organizationId}
          AND target_class."locationId" = ${input.locationId}
        FOR UPDATE OF target_class`,
  );
  const [selected] = await tx
    .select({
      id: studioBooking.id,
      classId: studioBooking.classId,
      clientId: studioBooking.clientId,
      status: studioBooking.status,
      paymentStatus: studioBooking.paymentStatus,
      startTime: studioClass.startTime,
      cancellationWindowHours: studioClass.cancellationWindowHours,
      selfCancellationBlocked: studioBooking.selfCancellationBlocked,
      selfCancelClosesAt: studioBooking.selfCancelClosesAt,
      locationId: studioClass.locationId,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
    .where(
      and(
        eq(studioBooking.id, input.bookingId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
      ),
    )
    .limit(1)
    .for("update", { of: studioBooking });
  if (!selected || !selected.locationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }
  const selectedLocationId = selected.locationId;
  if (["CANCELLED", "LATE_CANCEL"].includes(selected.status)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Booking is already cancelled",
    });
  }
  if (selected.status === "ATTENDED" || selected.startTime <= now) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "A completed or attended booking cannot be cancelled",
    });
  }

  if (input.channel !== "OPERATOR" && selected.selfCancellationBlocked) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Contact the studio to cancel this booking.",
    });
  }

  const deadline =
    selected.selfCancelClosesAt ??
    new Date(
      selected.startTime.getTime() -
        (selected.cancellationWindowHours ?? 12) * 60 * 60 * 1_000,
    );
  const isLateCancellation = now > deadline;
  let entitlementRestored = false;
  if (!isLateCancellation) {
    entitlementRestored = await restoreEntitlement({
      tx,
      bookingId: selected.id,
      organizationId: input.organizationId,
      locationId: input.locationId,
      restoredBy: input.cancelledBy ?? null,
      now,
    });
  }

  const status = isLateCancellation ? "LATE_CANCEL" : "CANCELLED";
  await tx
    .update(studioBooking)
    .set({
      status,
      cancelledAt: now,
      releasedAt: now,
      paymentStatus: selected.paymentStatus === "PAID" ? "PAID" : "EXPIRED",
      paymentFailureAt: selected.paymentStatus === "PAID" ? null : now,
      cancellationReason: isLateCancellation
        ? "Late cancellation"
        : "Cancelled",
      updatedAt: now,
    })
    .where(eq(studioBooking.id, selected.id));
  await tx
    .update(commerceOperation)
    .set({
      status: "CANCELLED",
      failureCode: "CLASS_BOOKING_CANCELLED",
      failureMessage: "Class booking was cancelled before payment completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(commerceOperation.studioBookingId, selected.id),
        inArray(commerceOperation.status, [
          "CREATED",
          "PROVIDER_PENDING",
          "REQUIRES_ACTION",
        ]),
      ),
    );

  const waitlistOffer = await reserveWaitlistOfferForReleasedSeat({
    tx,
    organizationId: input.organizationId,
    locationId: input.locationId,
    classId: selected.classId,
    now,
  });

  return {
    bookingId: selected.id,
    classId: selected.classId,
    clientId: selected.clientId,
    locationId: selectedLocationId,
    status,
    isLateCancellation,
    entitlementRestored,
    waitlistOffer,
  };
}

async function getLockedClass(
  tx: CommerceTransaction,
  input: CreateClassBookingInput,
): Promise<LockedClass> {
  const [selected] = await tx
    .select({
      id: studioClass.id,
      organizationId: studioClass.organizationId,
      locationId: studioClass.locationId,
      name: studioClass.name,
      startTime: studioClass.startTime,
      status: studioClass.status,
      maxCapacity: studioClass.maxCapacity,
      onlineCapacity: studioClass.onlineCapacity,
      onlineBookingEnabled: studioClass.onlineBookingEnabled,
      bookingWindowHours: studioClass.bookingWindowHours,
      cancellationWindowHours: studioClass.cancellationWindowHours,
      bookingOpensMinutesBeforeStart:
        studioClass.bookingOpensMinutesBeforeStart,
      bookingClosesMinutesBeforeStart:
        studioClass.bookingClosesMinutesBeforeStart,
      cancellationsCloseMinutesBeforeStart:
        studioClass.cancellationsCloseMinutesBeforeStart,
      blockClientCancellations: studioClass.blockClientCancellations,
      resolvedBookingWindowPolicyVersionId:
        studioClass.resolvedBookingWindowPolicyVersionId,
      bookingWindowPolicySource: studioClass.bookingWindowPolicySource,
      pricingModel: studioClass.pricingModel,
      dropInPrice: studioClass.dropInPrice,
      slidingScaleMinPrice: studioClass.slidingScaleMinPrice,
      slidingScaleMaxPrice: studioClass.slidingScaleMaxPrice,
      currency: studioClass.currency,
      classTypeId: studioClass.classTypeId,
      serviceTypeId: studioClass.serviceTypeId,
      serviceCategoryId: serviceType.categoryId,
      allowUnpaidBookings: serviceType.allowUnpaidBookings,
    })
    .from(studioClass)
    .leftJoin(serviceType, eq(studioClass.serviceTypeId, serviceType.id))
    .where(
      and(
        eq(studioClass.id, input.classId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
      ),
    )
    .limit(1);
  if (!selected || !selected.locationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
  }
  return {
    ...selected,
    locationId: selected.locationId,
    allowUnpaidBookings: selected.allowUnpaidBookings ?? false,
  };
}

function validateClassAvailability(
  targetClass: LockedClass,
  channel: BookingChannel,
  now: Date,
): void {
  if (
    targetClass.status === "CANCELLED" ||
    targetClass.status === "COMPLETED"
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Class is not available for booking",
    });
  }
  if (channel !== "OPERATOR" && !targetClass.onlineBookingEnabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Online booking is disabled for this class",
    });
  }
  if (channel !== "OPERATOR") {
    const opensMinutes =
      targetClass.bookingOpensMinutesBeforeStart ??
      (targetClass.bookingWindowHours ?? 168) * 60;
    const opensAt = new Date(
      targetClass.startTime.getTime() - opensMinutes * 60 * 1_000,
    );
    if (now < opensAt) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Booking has not opened for this class yet.",
      });
    }
    const closesAt = new Date(
      targetClass.startTime.getTime() -
        (targetClass.bookingClosesMinutesBeforeStart ?? 0) * 60 * 1_000,
    );
    if (now > closesAt) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Booking has closed for this class.",
      });
    }
  }
}

async function allocateMembershipEntitlement(input: {
  tx: CommerceTransaction;
  targetClass: LockedClass;
  clientId: string;
  now: Date;
}): Promise<Entitlement> {
  if (input.targetClass.pricingModel === "FREE") {
    return { source: "FREE", membershipId: null, classCreditId: null };
  }

  const memberships = await input.tx
    .select({
      id: studioMembership.id,
      planId: studioMembership.planId,
      totalClasses: studioMembership.totalClasses,
      usedClasses: studioMembership.usedClasses,
      planAllowedClassTypeIds: membershipPlan.allowedClassTypeIds,
    })
    .from(studioMembership)
    .leftJoin(membershipPlan, eq(studioMembership.planId, membershipPlan.id))
    .where(
      and(
        eq(studioMembership.clientId, input.clientId),
        eq(studioMembership.organizationId, input.targetClass.organizationId),
        eq(studioMembership.locationId, input.targetClass.locationId),
        lte(studioMembership.startDate, input.now),
        or(
          isNull(studioMembership.endDate),
          gt(studioMembership.endDate, input.now),
        ),
        or(
          eq(studioMembership.status, "ACTIVE"),
          and(
            eq(studioMembership.status, "PAST_DUE"),
            gt(studioMembership.paymentGraceEndsAt, input.now),
          ),
        ),
      ),
    )
    .orderBy(asc(studioMembership.startDate))
    .for("update");
  const eligible = await eligibleMembershipIds(
    input.tx,
    memberships,
    input.targetClass,
  );
  const eligibleMemberships = memberships.filter((membership) =>
    eligible.has(membership.id),
  );
  const credits =
    eligibleMemberships.length > 0
      ? await input.tx
          .select({
            id: classCredit.id,
            membershipId: classCredit.membershipId,
          })
          .from(classCredit)
          .where(
            and(
              inArray(
                classCredit.membershipId,
                eligibleMemberships.map((membership) => membership.id),
              ),
              eq(classCredit.clientId, input.clientId),
              eq(classCredit.organizationId, input.targetClass.organizationId),
              eq(classCredit.locationId, input.targetClass.locationId),
              sql`${classCredit.usedCredits} < ${classCredit.totalCredits}`,
              or(
                isNull(classCredit.expiresAt),
                gt(classCredit.expiresAt, input.now),
              ),
            ),
          )
          .orderBy(asc(classCredit.expiresAt))
          .for("update")
      : [];
  const creditByMembership = new Map<string, (typeof credits)[number]>();
  for (const credit of credits) {
    if (credit.membershipId && !creditByMembership.has(credit.membershipId)) {
      creditByMembership.set(credit.membershipId, credit);
    }
  }

  for (const membership of eligibleMemberships) {
    const credit = creditByMembership.get(membership.id);
    if (credit) {
      await input.tx
        .update(classCredit)
        .set({
          usedCredits: sql`${classCredit.usedCredits} + 1`,
          updatedAt: input.now,
        })
        .where(eq(classCredit.id, credit.id));
      return {
        source: "MEMBERSHIP_CREDIT",
        membershipId: membership.id,
        classCreditId: credit.id,
      };
    }

    const usedClasses = membership.usedClasses ?? 0;
    if (
      membership.totalClasses === null ||
      usedClasses < membership.totalClasses
    ) {
      await input.tx
        .update(studioMembership)
        .set({
          usedClasses: sql`coalesce(${studioMembership.usedClasses}, 0) + 1`,
          updatedAt: input.now,
        })
        .where(eq(studioMembership.id, membership.id));
      return {
        source: "MEMBERSHIP_ALLOWANCE",
        membershipId: membership.id,
        classCreditId: null,
      };
    }
  }

  if (input.targetClass.allowUnpaidBookings) {
    return {
      source: "UNPAID_ALLOWED",
      membershipId: null,
      classCreditId: null,
    };
  }
  return null;
}

async function eligibleMembershipIds(
  tx: CommerceTransaction,
  memberships: Array<{
    id: string;
    planId: string | null;
    planAllowedClassTypeIds: string[] | null;
  }>,
  targetClass: LockedClass,
): Promise<Set<string>> {
  const byPlan = new Map(
    memberships
      .filter((item): item is typeof item & { planId: string } =>
        Boolean(item.planId),
      )
      .map((item) => [item.planId, item]),
  );
  if (byPlan.size === 0) return new Set(memberships.map((item) => item.id));
  const options = await tx
    .select({
      id: pricingOption.id,
      membershipPlanId: pricingOption.membershipPlanId,
    })
    .from(pricingOption)
    .where(
      and(
        eq(pricingOption.organizationId, targetClass.organizationId),
        or(
          eq(pricingOption.locationId, targetClass.locationId),
          isNull(pricingOption.locationId),
        ),
        eq(pricingOption.isActive, true),
        inArray(pricingOption.membershipPlanId, [...byPlan.keys()]),
      ),
    );
  const optionIds = options.map((item) => item.id);
  const grants = optionIds.length
    ? await tx
        .select()
        .from(pricingOptionAccessGrant)
        .where(inArray(pricingOptionAccessGrant.pricingOptionId, optionIds))
    : [];
  const optionsByPlan = new Map<string, string[]>();
  for (const option of options) {
    if (!option.membershipPlanId) continue;
    optionsByPlan.set(option.membershipPlanId, [
      ...(optionsByPlan.get(option.membershipPlanId) ?? []),
      option.id,
    ]);
  }

  return new Set(
    memberships
      .filter((membership) => {
        if (!membership.planId) return true;
        const linked = optionsByPlan.get(membership.planId) ?? [];
        if (linked.length > 0) {
          return grants.some(
            (grant) =>
              linked.includes(grant.pricingOptionId) &&
              grantMatchesClass(grant, targetClass),
          );
        }
        const legacy = membership.planAllowedClassTypeIds ?? [];
        return (
          legacy.length === 0 ||
          Boolean(
            targetClass.classTypeId && legacy.includes(targetClass.classTypeId),
          )
        );
      })
      .map((membership) => membership.id),
  );
}

function grantMatchesClass(
  grant: typeof pricingOptionAccessGrant.$inferSelect,
  targetClass: LockedClass,
): boolean {
  if (grant.targetType === "ALL_SERVICES") return true;
  if (grant.targetType === "SERVICE_TYPE") {
    return grant.serviceTypeId === targetClass.serviceTypeId;
  }
  if (grant.targetType === "SERVICE_CATEGORY") {
    return grant.serviceCategoryId === targetClass.serviceCategoryId;
  }
  return grant.classTypeId === targetClass.classTypeId;
}

function resolvePaymentRequirement(input: {
  targetClass: LockedClass;
  entitlement: Entitlement;
  slidingScaleAmount?: string | null;
  now: Date;
}): {
  requiresPayment: boolean;
  amount: string | null;
  currency: string | null;
  holdExpiresAt: Date | null;
} {
  if (input.entitlement) {
    return {
      requiresPayment: false,
      amount: null,
      currency: null,
      holdExpiresAt: null,
    };
  }
  if (input.targetClass.pricingModel === "PACKAGE_ONLY") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Member does not have an eligible membership or class credit",
    });
  }

  const amount =
    input.targetClass.pricingModel === "SLIDING_SCALE"
      ? input.slidingScaleAmount
      : input.targetClass.dropInPrice;
  const currency = normalizeCurrency(input.targetClass.currency);
  const exponent = currencyExponent(currency);
  let amountMinor: number;
  try {
    amountMinor = amount ? decimalToMinorUnits(amount, exponent) : 0;
  } catch {
    amountMinor = 0;
  }
  if (!amount || amountMinor <= 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This class does not have a valid checkout price",
    });
  }
  if (input.targetClass.pricingModel === "SLIDING_SCALE") {
    let minimumMinor: number;
    let maximumMinor: number;
    try {
      minimumMinor = decimalToMinorUnits(
        input.targetClass.slidingScaleMinPrice ?? "0",
        exponent,
      );
      maximumMinor = decimalToMinorUnits(
        input.targetClass.slidingScaleMaxPrice ?? amount,
        exponent,
      );
    } catch {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The class sliding-scale configuration is invalid",
      });
    }
    if (amountMinor < minimumMinor || amountMinor > maximumMinor) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selected price is outside the class sliding-scale range",
      });
    }
  }
  if (
    input.targetClass.startTime.getTime() - input.now.getTime() <
    MINIMUM_CHECKOUT_WINDOW_MS
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "This paid class is too close to its start time for online checkout",
    });
  }
  const holdExpiresAt = new Date(
    Math.min(
      input.now.getTime() + PAYMENT_HOLD_MS,
      input.targetClass.startTime.getTime() - 60_000,
    ),
  );
  return {
    requiresPayment: true,
    amount,
    currency,
    holdExpiresAt,
  };
}

async function restoreEntitlement(input: {
  tx: CommerceTransaction;
  bookingId: string;
  organizationId: string;
  locationId: string;
  restoredBy: string | null;
  now: Date;
}): Promise<boolean> {
  const [allocation] = await input.tx
    .select()
    .from(bookingEntitlementAllocation)
    .where(
      and(
        eq(bookingEntitlementAllocation.bookingId, input.bookingId),
        eq(bookingEntitlementAllocation.organizationId, input.organizationId),
        eq(bookingEntitlementAllocation.locationId, input.locationId),
        eq(bookingEntitlementAllocation.status, "ACTIVE"),
      ),
    )
    .limit(1)
    .for("update");
  if (!allocation) return false;
  if (allocation.source === "MEMBERSHIP_CREDIT" && allocation.classCreditId) {
    await input.tx
      .update(classCredit)
      .set({
        usedCredits: sql`greatest(${classCredit.usedCredits} - 1, 0)`,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(classCredit.id, allocation.classCreditId),
          eq(classCredit.organizationId, input.organizationId),
          eq(classCredit.locationId, input.locationId),
        ),
      );
  }
  if (allocation.source === "MEMBERSHIP_ALLOWANCE" && allocation.membershipId) {
    await input.tx
      .update(studioMembership)
      .set({
        usedClasses: sql`greatest(coalesce(${studioMembership.usedClasses}, 0) - 1, 0)`,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(studioMembership.id, allocation.membershipId),
          eq(studioMembership.organizationId, input.organizationId),
          eq(studioMembership.locationId, input.locationId),
        ),
      );
  }
  await input.tx
    .update(bookingEntitlementAllocation)
    .set({
      status: "RESTORED",
      restoredAt: input.now,
      restoredBy: input.restoredBy,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(bookingEntitlementAllocation.id, allocation.id),
        eq(bookingEntitlementAllocation.status, "ACTIVE"),
      ),
    );
  return true;
}

function bookingResult(
  targetClass: LockedClass,
  clientId: string,
  booking: {
    id: string;
    paymentStatus: CreateClassBookingResult["paymentStatus"];
    amount: string | null;
    currency: string | null;
    holdExpiresAt: Date | null;
  },
  created: boolean,
): CreateClassBookingResult {
  return {
    bookingId: booking.id,
    classId: targetClass.id,
    clientId,
    organizationId: targetClass.organizationId,
    locationId: targetClass.locationId,
    created,
    requiresPayment: ["REQUIRES_PAYMENT", "PROCESSING", "FAILED"].includes(
      booking.paymentStatus,
    ),
    paymentStatus: booking.paymentStatus,
    amount: booking.amount,
    currency: booking.currency,
    holdExpiresAt: booking.holdExpiresAt,
    className: targetClass.name,
    classStartTime: targetClass.startTime,
  };
}
