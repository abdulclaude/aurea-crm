import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const service = source("src/features/studio/server/class-booking-service.ts");
const checkout = source("src/features/studio/server/class-booking-checkout.ts");
const api = source("src/app/api/v1/bookings/route.ts");
const resolveCheckout = source(
  "src/features/commerce/server/stripe/resolve-checkout-scope.ts",
);
const applyCheckout = source(
  "src/features/commerce/server/stripe/apply-studio-checkout.ts",
);
const failure = source(
  "src/features/commerce/server/stripe/apply-checkout-failure.ts",
);
const expiry = source(
  "src/features/commerce/server/recovery/booking-hold-expiration.ts",
);
const publicRecovery = source(
  "src/features/commerce/server/recovery/payment-recovery-public-service.ts",
);
const refund = source(
  "src/features/commerce/server/stripe/apply-refund-dispute.ts",
);
const workflowDispatch = source(
  "src/features/studio/server/paid-class-booking-workflow-dispatch.ts",
);

describe("authoritative class booking payment contract", () => {
  it("serializes capacity and allocates one exact-scope entitlement", () => {
    assert.match(service, /StudioClass[\s\S]*FOR UPDATE/);
    assert.match(service, /eq\(client\.locationId, input\.locationId\)/);
    assert.match(
      service,
      /eq\(studioMembership\.locationId, input\.targetClass\.locationId\)/,
    );
    assert.match(service, /MEMBERSHIP_CREDIT/);
    assert.match(service, /MEMBERSHIP_ALLOWANCE/);
    assert.match(service, /bookingEntitlementAllocation/);
  });

  it("restores entitlements once only for timely cancellations", () => {
    assert.match(service, /if \(!isLateCancellation\)/);
    assert.match(
      service,
      /eq\(bookingEntitlementAllocation\.status, "ACTIVE"\)/,
    );
    assert.match(service, /status: "RESTORED"/);
    assert.match(service, /greatest\(\$\{classCredit\.usedCredits\} - 1, 0\)/);
  });

  it("rejects unbound API keys and delegates API writes to the same service", () => {
    assert.match(api, /if \(!auth\.apiKey\.locationId\)/);
    assert.match(api, /createClassBooking\(/);
    assert.match(api, /channel: "API"/);
    assert.match(api, /dispatchClassBookingWorkflow\(booking\.bookingId\)/);
    assert.match(api, /export async function DELETE/);
  });

  it("prevents location actors from mutating legacy organization API keys", () => {
    const apiKeysRouter = source(
      "src/features/studio/server/api-keys-router.ts",
    );
    assert.match(
      apiKeysRouter,
      /locationId\s*\? eq\(apiKey\.locationId, locationId\)\s*:\s*isNull\(apiKey\.locationId\)/,
    );
  });

  it("binds Stripe checkout to the exact location Express account", () => {
    assert.match(
      checkout,
      /eq\(stripeConnection\.locationId, input\.locationId\)/,
    );
    assert.match(checkout, /expectedStripeConnectionId/);
    assert.match(checkout, /expectedProviderAccountRef/);
    assert.match(checkout, /calculateApplicationFeeMinor/);
    assert.match(checkout, /studioBookingId: selected\.id/);
  });

  it("projects success, failure, expiry, and signed recovery for class bookings", () => {
    assert.match(resolveCheckout, /CLASS_BOOKING/);
    assert.match(applyCheckout, /applyClassBookingCheckout/);
    assert.match(applyCheckout, /late-payment/);
    assert.match(applyCheckout, /paidWorkflowPending/);
    assert.match(failure, /applyClassBookingFailure/);
    assert.match(expiry, /dueClassBookings/);
    assert.doesNotMatch(expiry, /if \(!connection\) continue/);
    assert.match(expiry, /operationBindings/);
    assert.match(expiry, /requiresManualReview: true/);
    assert.match(expiry, /operatorReviewOnly: true/);
    assert.match(publicRecovery, /createClassBookingRecoveryDestination/);
    assert.match(publicRecovery, /expectedProviderAccountRef/);
  });

  it("keeps workflow dispatch durable and projects full refunds", () => {
    assert.match(service, /classBookedWorkflowPending/);
    assert.match(applyCheckout, /classBookedWorkflowPending/);
    assert.match(workflowDispatch, /dispatchClassBookingWorkflow/);
    assert.match(workflowDispatch, /idempotencyKey: `class-booked:/);
    assert.match(refund, /projectFullBookingRefund/);
    assert.match(refund, /booking\.paymentStatus, "PAID"/);
    assert.match(refund, /studioBooking\.paymentStatus, "PAID"/);
    assert.match(refund, /paymentStatus: "REFUNDED"/);
  });
});
