import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const expirationSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/commerce/server/recovery/booking-hold-expiration.ts",
  ),
  "utf8",
);
const actionRunnerSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/commerce/server/recovery/payment-recovery-action-runner.ts",
  ),
  "utf8",
);
const releaseBookingHoldSource = actionRunnerSource.slice(
  actionRunnerSource.indexOf("async function releaseBookingHold"),
  actionRunnerSource.indexOf("async function recoveryRecipient"),
);

test("hold expiry locks due bookings and only records successful conditional releases", () => {
  assert.match(expirationSource, /\.for\("update", \{ skipLocked: true \}\)/);
  assert.match(
    expirationSource,
    /\.for\("update", \{ of: studioBooking, skipLocked: true \}\)/,
  );
  assert.equal(
    expirationSource.match(
      /\.returning\(\{ id: (?:booking|studioBooking)\.id \}\)/g,
    )?.length,
    2,
  );
  assert.equal(
    expirationSource.match(/if \(!released\) continue;/g)?.length,
    2,
  );
  assert.equal(
    expirationSource.match(
      /inArray\((?:booking|studioBooking)\.paymentStatus, \[\s*"REQUIRES_PAYMENT",\s*"PROCESSING",\s*"FAILED",\s*\]\)/g,
    )?.length,
    4,
  );
});

test("terminal booking expiry is operator-only and cannot schedule customer recovery", () => {
  assert.equal(
    expirationSource.match(/metadata: \{ requiresManualReview: true \}/g)
      ?.length,
    2,
  );
  assert.equal(expirationSource.match(/operatorReviewOnly: true/g)?.length, 2);
  assert.doesNotMatch(expirationSource, /operatorReviewOnly: !stripeBound/);
});

test("recovery release re-locks rows and cannot overwrite paid bookings", () => {
  assert.equal(
    releaseBookingHoldSource.match(/db\.transaction\(async \(tx\)/g)?.length,
    2,
  );
  assert.equal(releaseBookingHoldSource.match(/\.for\("update"/g)?.length, 2);
  assert.match(releaseBookingHoldSource, /eq\(booking\.paid, false\)/);
  assert.equal(
    releaseBookingHoldSource.match(
      /inArray\((?:booking|studioBooking)\.paymentStatus, \[\s*"REQUIRES_PAYMENT",\s*"PROCESSING",\s*"FAILED",\s*"EXPIRED",\s*\]\)/g,
    )?.length,
    2,
  );
  assert.doesNotMatch(
    releaseBookingHoldSource,
    /\.where\(eq\((?:booking|studioBooking)\.id/,
  );
});
