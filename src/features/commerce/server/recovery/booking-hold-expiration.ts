import "server-only";

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, lte, or } from "drizzle-orm";

import { db } from "@/db";
import {
  booking,
  commerceOperation,
  paymentRecoveryAction,
  studioBooking,
  studioClass,
} from "@/db/schema";
import {
  currencyExponent,
  decimalToMinorUnits,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import {
  reserveWaitlistOfferForReleasedSeat,
  type WaitlistOffer,
} from "@/features/studio/server/waitlist-offer-service";
import { dispatchWaitlistSpotOpened } from "@/features/studio/server/waitlist-workflow-dispatch";

import { openPaymentRecoveryCase } from "./payment-recovery-case-service";

const HOLD_BATCH_SIZE = 50;

export async function expireDueBookingPaymentHolds(
  now = new Date(),
): Promise<number> {
  const result = await db.transaction(async (tx) => {
    const waitlistOffers: WaitlistOffer[] = [];
    const due = await tx
      .select({
        id: booking.id,
        organizationId: booking.organizationId,
        locationId: booking.locationId,
        clientId: booking.clientId,
        amount: booking.amount,
        currency: booking.currency,
      })
      .from(booking)
      .where(
        and(
          eq(booking.status, "PENDING"),
          eq(booking.paid, false),
          inArray(booking.paymentStatus, [
            "REQUIRES_PAYMENT",
            "PROCESSING",
            "FAILED",
          ]),
          lte(booking.holdExpiresAt, now),
        ),
      )
      .orderBy(asc(booking.holdExpiresAt))
      .limit(HOLD_BATCH_SIZE)
      .for("update", { skipLocked: true });

    const dueClassBookings = await tx
      .select({
        id: studioBooking.id,
        classId: studioBooking.classId,
        organizationId: studioClass.organizationId,
        locationId: studioClass.locationId,
        clientId: studioBooking.clientId,
        amount: studioBooking.amount,
        currency: studioBooking.currency,
      })
      .from(studioBooking)
      .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
      .where(
        and(
          eq(studioBooking.status, "BOOKED"),
          inArray(studioBooking.paymentStatus, [
            "REQUIRES_PAYMENT",
            "PROCESSING",
            "FAILED",
          ]),
          lte(studioBooking.holdExpiresAt, now),
        ),
      )
      .orderBy(asc(studioBooking.holdExpiresAt))
      .limit(HOLD_BATCH_SIZE)
      .for("update", { of: studioBooking, skipLocked: true });

    const bookingIds = due.map((item) => item.id);
    const classBookingIds = dueClassBookings.map((item) => item.id);
    const operationBindings =
      bookingIds.length > 0 || classBookingIds.length > 0
        ? await tx
            .select({
              id: commerceOperation.id,
              bookingId: commerceOperation.bookingId,
              studioBookingId: commerceOperation.studioBookingId,
              stripeConnectionId: commerceOperation.stripeConnectionId,
              providerAccountId: commerceOperation.providerAccountId,
            })
            .from(commerceOperation)
            .where(
              and(
                eq(commerceOperation.provider, "STRIPE"),
                eq(commerceOperation.type, "CHECKOUT"),
                or(
                  bookingIds.length > 0
                    ? inArray(commerceOperation.bookingId, bookingIds)
                    : undefined,
                  classBookingIds.length > 0
                    ? inArray(
                        commerceOperation.studioBookingId,
                        classBookingIds,
                      )
                    : undefined,
                ),
              ),
            )
            .orderBy(desc(commerceOperation.createdAt))
        : [];
    const bookingBindings = new Map<
      string,
      (typeof operationBindings)[number]
    >();
    const classBookingBindings = new Map<
      string,
      (typeof operationBindings)[number]
    >();
    for (const binding of operationBindings) {
      if (binding.bookingId && !bookingBindings.has(binding.bookingId)) {
        bookingBindings.set(binding.bookingId, binding);
      }
      if (
        binding.studioBookingId &&
        !classBookingBindings.has(binding.studioBookingId)
      ) {
        classBookingBindings.set(binding.studioBookingId, binding);
      }
    }

    let expired = 0;
    for (const selected of due) {
      const [released] = await tx
        .update(booking)
        .set({
          status: "CANCELLED",
          paymentStatus: "EXPIRED",
          paymentFailureAt: now,
          cancelledAt: now,
          cancellationReason: "Payment hold expired",
          releasedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(booking.id, selected.id),
            eq(booking.status, "PENDING"),
            eq(booking.paid, false),
            inArray(booking.paymentStatus, [
              "REQUIRES_PAYMENT",
              "PROCESSING",
              "FAILED",
            ]),
            lte(booking.holdExpiresAt, now),
          ),
        )
        .returning({ id: booking.id });
      if (!released) continue;

      const binding = bookingBindings.get(selected.id);
      const stripeBound = Boolean(
        binding?.stripeConnectionId && binding.providerAccountId,
      );
      const currency = normalizeCurrency(selected.currency ?? "GBP");
      const exponent = currencyExponent(currency);
      const amountMinor = selected.amount
        ? decimalToMinorUnits(selected.amount, exponent)
        : 0;
      const recovery = await openPaymentRecoveryCase({
        tx,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        clientId: selected.clientId,
        target: "BOOKING",
        caseKey: `booking:${selected.id}`,
        bookingId: selected.id,
        sourceEventId: null,
        sourceEventAt: now,
        attemptKey: `booking-hold:${selected.id}:expired`,
        amountMinor,
        currency,
        currencyExponent: exponent,
        commerceOperationId: binding?.id,
        provider: stripeBound ? "STRIPE" : "INTERNAL",
        providerAccountRef: binding?.providerAccountId ?? null,
        stripeConnectionId: binding?.stripeConnectionId ?? null,
        providerObjectId: selected.id,
        errorCode: stripeBound
          ? "BOOKING_PAYMENT_HOLD_EXPIRED"
          : "BOOKING_PAYMENT_HOLD_EXPIRED_UNBOUND",
        errorMessage:
          "Booking payment was not completed before the hold expired",
        metadata: { requiresManualReview: true },
        operatorReviewOnly: true,
      });

      await tx
        .insert(paymentRecoveryAction)
        .values({
          id: randomUUID(),
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          caseId: recovery.caseId,
          type: "RELEASE_BOOKING",
          status: "SCHEDULED",
          sequence: 100,
          idempotencyKey: `recovery:${recovery.caseId}:release-booking`,
          scheduledAt: now,
          availableAt: now,
          maxAttempts: 5,
          payload: { bookingId: selected.id },
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: paymentRecoveryAction.idempotencyKey });
      await tx
        .update(commerceOperation)
        .set({
          status: "CANCELLED",
          failureCode: "BOOKING_PAYMENT_HOLD_EXPIRED",
          failureMessage: "Booking payment hold expired",
          completedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(commerceOperation.bookingId, selected.id),
            inArray(commerceOperation.status, [
              "CREATED",
              "PROVIDER_PENDING",
              "REQUIRES_ACTION",
            ]),
          ),
        );
      expired += 1;
    }

    for (const selected of dueClassBookings) {
      if (!selected.locationId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "A due class booking is missing its location scope.",
        });
      }
      const [released] = await tx
        .update(studioBooking)
        .set({
          status: "CANCELLED",
          paymentStatus: "EXPIRED",
          paymentFailureAt: now,
          cancelledAt: now,
          cancellationReason: "Payment hold expired",
          releasedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(studioBooking.id, selected.id),
            eq(studioBooking.status, "BOOKED"),
            inArray(studioBooking.paymentStatus, [
              "REQUIRES_PAYMENT",
              "PROCESSING",
              "FAILED",
            ]),
            lte(studioBooking.holdExpiresAt, now),
          ),
        )
        .returning({ id: studioBooking.id });
      if (!released) continue;
      const waitlistOffer = await reserveWaitlistOfferForReleasedSeat({
        tx,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        classId: selected.classId,
        now,
      });
      if (waitlistOffer) waitlistOffers.push(waitlistOffer);

      const binding = classBookingBindings.get(selected.id);
      const stripeBound = Boolean(
        binding?.stripeConnectionId && binding.providerAccountId,
      );
      const currency = normalizeCurrency(selected.currency ?? "GBP");
      const exponent = currencyExponent(currency);
      const amountMinor = selected.amount
        ? decimalToMinorUnits(selected.amount, exponent)
        : 0;
      const recovery = await openPaymentRecoveryCase({
        tx,
        organizationId: selected.organizationId,
        locationId: selected.locationId,
        clientId: selected.clientId,
        target: "BOOKING",
        caseKey: `class-booking:${selected.id}`,
        studioBookingId: selected.id,
        sourceEventId: null,
        sourceEventAt: now,
        attemptKey: `class-booking-hold:${selected.id}:expired`,
        amountMinor,
        currency,
        currencyExponent: exponent,
        commerceOperationId: binding?.id,
        provider: stripeBound ? "STRIPE" : "INTERNAL",
        providerAccountRef: binding?.providerAccountId ?? null,
        stripeConnectionId: binding?.stripeConnectionId ?? null,
        providerObjectId: selected.id,
        errorCode: stripeBound
          ? "CLASS_BOOKING_PAYMENT_HOLD_EXPIRED"
          : "CLASS_BOOKING_PAYMENT_HOLD_EXPIRED_UNBOUND",
        errorMessage:
          "Class booking payment was not completed before the hold expired",
        metadata: { requiresManualReview: true },
        operatorReviewOnly: true,
      });
      await tx
        .insert(paymentRecoveryAction)
        .values({
          id: randomUUID(),
          organizationId: selected.organizationId,
          locationId: selected.locationId,
          caseId: recovery.caseId,
          type: "RELEASE_BOOKING",
          status: "SCHEDULED",
          sequence: 100,
          idempotencyKey: `recovery:${recovery.caseId}:release-class-booking`,
          scheduledAt: now,
          availableAt: now,
          maxAttempts: 5,
          payload: { studioBookingId: selected.id },
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: paymentRecoveryAction.idempotencyKey });
      await tx
        .update(commerceOperation)
        .set({
          status: "CANCELLED",
          failureCode: "CLASS_BOOKING_PAYMENT_HOLD_EXPIRED",
          failureMessage: "Class booking payment hold expired",
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
      expired += 1;
    }
    return { expired, waitlistOffers };
  });
  for (const offer of result.waitlistOffers) {
    await dispatchWaitlistSpotOpened({
      organizationId: offer.organizationId,
      locationId: offer.locationId,
      waitlistId: offer.id,
      clientId: offer.clientId,
      classId: offer.classId,
      notifiedAt: offer.notifiedAt,
    });
  }
  return result.expired;
}
