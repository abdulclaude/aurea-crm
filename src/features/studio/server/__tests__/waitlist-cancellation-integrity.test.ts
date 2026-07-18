import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("waitlist cancellation integrity", () => {
  const bookingService = source(
    "src/features/studio/server/class-booking-service.ts",
  );
  const offerService = source(
    "src/features/studio/server/waitlist-offer-service.ts",
  );
  const bookingRouter = source(
    "src/features/studio/server/bookings-router.ts",
  );
  const apiRoute = source("src/app/api/v1/bookings/route.ts");
  const holdExpiration = source(
    "src/features/commerce/server/recovery/booking-hold-expiration.ts",
  );
  const dispatch = source(
    "src/features/studio/server/waitlist-workflow-dispatch.ts",
  );
  const checkoutFailure = source(
    "src/features/commerce/server/stripe/apply-checkout-failure.ts",
  );
  const waitlistService = source(
    "src/features/studio/server/waitlist-service.ts",
  );
  const waitlistRouter = source(
    "src/features/studio/server/waitlist-router.ts",
  );
  const classesRouter = source(
    "src/features/studio/server/classes-router.ts",
  );
  const commerceOperations = source(
    "src/features/commerce/server/operations.ts",
  );

  it("reserves the earliest waiter under the class transaction lock", () => {
    assert.match(offerService, /StudioClass.*FOR UPDATE/s);
    assert.match(offerService, /autoPromoteWaitlist/);
    assert.match(offerService, /waitlistEnabled/);
    assert.match(offerService, /targetClass\.status !== "SCHEDULED"/);
    assert.match(offerService, /targetClass\.startTime <= input\.now/);
    assert.match(offerService, /orderBy\(asc\(classWaitlist\.position\)\)/);
    assert.match(
      offerService,
      /eq\(classWaitlist\.status, "WAITING"\)/,
    );
    assert.match(bookingService, /reserveWaitlistOfferForReleasedSeat/);
  });

  it("does not bypass the authoritative reservation service in the UI route", () => {
    assert.doesNotMatch(bookingRouter, /db\.query\.classWaitlist/);
    assert.match(bookingRouter, /cancelled\.waitlistOffer/);
    assert.match(bookingRouter, /dispatchWaitlistSpotOpened/);
  });

  it("uses the same reservation result for API, switch, and hold-expiry releases", () => {
    assert.match(apiRoute, /cancelled\.waitlistOffer/);
    assert.match(bookingRouter, /waitlistOffer: cancelled\.waitlistOffer/);
    assert.match(holdExpiration, /reserveWaitlistOfferForReleasedSeat/);
    assert.match(holdExpiration, /waitlistOffers/);
    assert.match(checkoutFailure, /reserveWaitlistOfferForReleasedSeat/);
  });

  it("dispatches each reserved offer with a stable idempotency key", () => {
    assert.match(
      dispatch,
      /waitlist-offer:\$\{input\.waitlistId\}:\$\{input\.notifiedAt\.toISOString\(\)\}/,
    );
    assert.match(
      dispatch,
      /waitlist-spot-opened:\$\{offer\.waitlistId\}:\$\{offer\.notifiedAt\.toISOString\(\)\}/,
    );
  });

  it("expires a declined offer and reserves its successor atomically", () => {
    assert.match(
      waitlistService,
      /declineClassWaitlistEntry[\s\S]*db\.transaction[\s\S]*reserveWaitlistOfferForReleasedSeat/,
    );
    assert.match(waitlistRouter, /const next = declined\.waitlistOffer/);
    assert.doesNotMatch(waitlistRouter, /reserveAutoWaitlistOffer/);
  });

  it("never offers stale classes or resurrects terminal checkout state", () => {
    assert.match(
      waitlistService,
      /targetClass\.status !== "SCHEDULED"[\s\S]*targetClass\.startTime <= now/,
    );
    assert.match(checkoutFailure, /selected\.status !== "BOOKED"/);
    assert.match(
      checkoutFailure,
      /\["REQUIRES_PAYMENT", "PROCESSING"\]\.includes\(selected\.paymentStatus\)/,
    );
    assert.match(
      commerceOperations,
      /inArray\(commerceOperation\.status, \[[\s\S]*"CREATED"[\s\S]*"PROVIDER_PENDING"[\s\S]*"REQUIRES_ACTION"/,
    );
  });

  it("closes waiting and already-notified offers when a class is cancelled", () => {
    assert.match(
      classesRouter,
      /inArray\(classWaitlist\.status, \["WAITING", "NOTIFIED"\]\)/,
    );
    assert.match(classesRouter, /status: "CANCELLED_WAITLIST"/);
    assert.match(classesRouter, /respondedAt: cancelledAt/);
  });
});
