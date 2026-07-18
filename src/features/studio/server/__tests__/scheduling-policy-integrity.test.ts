import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("scheduling policy integrity", () => {
  const migration = source("drizzle/0079_scheduling_policies.sql");
  const router = source(
    "src/features/studio/server/scheduling-policy-router.ts",
  );
  const materializer = source(
    "src/features/studio/server/scheduling-policy-materializer.ts",
  );
  const classesRouter = source("src/features/studio/server/classes-router.ts");
  const bookingService = source(
    "src/features/studio/server/class-booking-service.ts",
  );
  const waitlistService = source(
    "src/features/studio/server/waitlist-service.ts",
  );
  const offerService = source(
    "src/features/studio/server/waitlist-offer-service.ts",
  );
  const offerExpiration = source(
    "src/features/studio/server/waitlist-offer-expiration.ts",
  );
  const workflowDispatch = source(
    "src/features/studio/server/waitlist-workflow-dispatch.ts",
  );
  const waitlistInngest = source("src/inngest/functions/waitlist-offers.ts");
  const inngestRoute = source("src/app/api/inngest/route.ts");
  const classForm = source(
    "src/features/studio/components/class-create-form/booking-policy-fields.tsx",
  );
  const settingsPage = source(
    "src/features/studio/components/scheduling-settings/scheduling-settings-page.tsx",
  );

  it("stores immutable scoped versions and resolved occurrence provenance", () => {
    assert.match(migration, /CREATE TABLE "BookingWindowPolicyVersion"/);
    assert.match(migration, /CREATE TABLE "WaitlistPolicyVersion"/);
    assert.match(migration, /policy_version_key/);
    assert.match(migration, /resolvedBookingWindowPolicyVersionId/);
    assert.match(migration, /resolvedWaitlistPolicyVersionId/);
    assert.match(migration, /bookingWindowPolicySource/);
    assert.match(migration, /waitlistPolicySource/);
    assert.match(migration, /offerDispatchAttempts/);
    assert.match(migration, /offerDispatchedAt/);
    assert.match(migration, /waitlistOfferExpiryMinutes" = CASE/);
    assert.match(migration, /StudioBooking_validate_scheduling_policy_scope/);
    assert.match(migration, /ClassWaitlist_validate_scheduling_policy_scope/);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  });

  it("separates settings management from class scheduling access", () => {
    assert.match(router, /listForClass[\s\S]*"schedule\.view"/);
    assert.match(router, /previewForClass[\s\S]*"schedule\.view"/);
    assert.match(router, /createBookingWindow[\s\S]*"settings\.manage"/);
    assert.match(router, /assignToService[\s\S]*"settings\.manage"/);
  });

  it("materializes policies for create, policy-affecting update, and duplicate", () => {
    assert.equal(
      (
        classesRouter.match(/materializeSchedulingPoliciesForOccurrences\(/g) ??
        []
      ).length,
      3,
    );
    assert.equal(
      (
        classesRouter.match(
          /requireSchedulingPolicyAccess\(ctx, "schedule\.manage"\)/g,
        ) ?? []
      ).length,
      3,
    );
    assert.match(materializer, /Promise\.all\(/);
    assert.match(materializer, /schedulingCandidatesAt/);
    assert.match(materializer, /requireExplicitSchedulingCandidate/);
  });

  it("enforces stored booking windows and cancellation snapshots", () => {
    assert.match(bookingService, /bookingOpensMinutesBeforeStart/);
    assert.match(bookingService, /bookingClosesMinutesBeforeStart/);
    assert.match(bookingService, /selfCancelClosesAt/);
    assert.match(bookingService, /selfCancellationBlocked/);
    assert.match(bookingService, /bookingWindowPolicySource/);
  });

  it("enforces waitlist capacity, overlap rules, and expiring offers", () => {
    assert.match(waitlistService, /waitlistMaxEntries/);
    assert.match(waitlistService, /waitlistAllowOverlappingReservations/);
    assert.match(waitlistService, /offerExpiresAt <=/);
    assert.match(
      offerService,
      /resolvedWaitlistMode\(targetClass\) !== "OFFER_NEXT"/,
    );
    assert.match(offerService, /waitlistPromotionClosed/);
    assert.match(offerService, /waitlistOfferExpiryMinutes/);
    assert.match(offerService, /offerExpiresAt/);
  });

  it("expires abandoned offers, advances the queue, and durably retries dispatch", () => {
    assert.match(offerExpiration, /eq\(classWaitlist\.status, "NOTIFIED"\)/);
    assert.match(offerExpiration, /status: "EXPIRED"/);
    assert.match(offerExpiration, /reserveWaitlistOfferForReleasedSeat/);
    assert.match(workflowDispatch, /offerDispatchAttempts/);
    assert.match(workflowDispatch, /offerDispatchError/);
    assert.match(workflowDispatch, /\.returning\(\{ id: classWaitlist\.id \}\)/);
    assert.match(workflowDispatch, /if \(!claimed\) return \{ status: "IGNORED" \}/);
    assert.match(workflowDispatch, /findPendingWaitlistSpotOpenedDispatches/);
    assert.match(waitlistInngest, /cron: "\* \* \* \* \*"/);
    assert.match(waitlistInngest, /expireDueWaitlistOffers/);
    assert.match(waitlistInngest, /processWaitlistSpotOpenedDispatch/);
    assert.match(inngestRoute, /dispatchWaitlistOffer/);
    assert.match(inngestRoute, /recoverWaitlistOffers/);
  });

  it("exposes policy selectors and an operator-focused settings surface", () => {
    assert.match(classForm, /bookingWindowPolicyOverrideId/);
    assert.match(classForm, /waitlistPolicyOverrideId/);
    assert.doesNotMatch(classForm, /bookingWindowHours/);
    assert.doesNotMatch(classForm, /autoPromoteWaitlist/);
    assert.match(settingsPage, /Booking windows/);
    assert.match(settingsPage, /Waitlists/);
    assert.match(settingsPage, /Service assignments/);
    assert.match(settingsPage, /Resolution preview/);
  });
});
