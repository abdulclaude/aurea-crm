import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const router = source("src/features/studio/server/waitlist-router.ts");
const waitlistService = source(
  "src/features/studio/server/waitlist-service.ts",
);
const bookingService = source(
  "src/features/studio/server/class-booking-service.ts",
);

describe("waitlist booking integrity", () => {
  it("requires a location and explicit capabilities for every route", () => {
    assert.match(router, /Select a location before managing waitlists/);
    assert.match(router, /requireWaitlistCapability\(ctx, "schedule\.view"\)/);
    assert.match(
      router,
      /requireWaitlistCapability\(ctx, "schedule\.manage"\)/,
    );
    assert.match(
      router,
      /requireWaitlistCapability\(ctx, "commerce\.checkout\.create"\)/,
    );
    assert.equal(
      (router.match(/requireWaitlistCapability\(ctx,/g) ?? []).length,
      8,
    );
  });

  it("enforces the exact organization and location for classes and members", () => {
    assert.match(
      waitlistService,
      /eq\(studioClass\.organizationId, input\.organizationId\)/,
    );
    assert.match(
      waitlistService,
      /eq\(studioClass\.locationId, input\.locationId\)/,
    );
    assert.match(
      waitlistService,
      /eq\(client\.organizationId, input\.organizationId\)/,
    );
    assert.match(
      waitlistService,
      /eq\(client\.locationId, input\.locationId\)/,
    );
  });

  it("serializes positions and confirmation state transitions", () => {
    assert.match(waitlistService, /FROM "StudioClass"[\s\S]*FOR UPDATE/);
    assert.match(waitlistService, /FROM "ClassWaitlist"[\s\S]*FOR UPDATE/);
    assert.match(waitlistService, /eq\(classWaitlist\.status, "NOTIFIED"\)/);
    assert.match(waitlistService, /status: "CONFIRMED"/);
  });

  it("delegates confirmation to authoritative booking, checkout, and workflow paths", () => {
    assert.match(waitlistService, /createClassBooking\([\s\S]*?,\s*tx,/);
    assert.doesNotMatch(waitlistService, /\.insert\(studioBooking\)/);
    assert.match(
      bookingService,
      /transaction\?: CommerceTransaction[\s\S]*createClassBookingInTransaction/,
    );
    assert.match(router, /createClassBookingCheckout/);
    assert.match(router, /dispatchClassBookingWorkflow/);
  });
});
