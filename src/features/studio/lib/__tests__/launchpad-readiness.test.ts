import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLaunchpadReadiness,
  hasPaidPublicSale,
  isSupportedCurrency,
  isValidLocalPricing,
} from "@/features/studio/lib/launchpad-readiness";

test("pricing readiness requires a valid price in the workspace currency", () => {
  assert.equal(
    isValidLocalPricing({ currency: "gbp", price: "49.00" }, "GBP"),
    true,
  );
  assert.equal(
    isValidLocalPricing({ currency: "USD", price: "49.00" }, "GBP"),
    false,
  );
  assert.equal(
    isValidLocalPricing({ currency: "GBP", price: "not-money" }, "GBP"),
    false,
  );
  assert.equal(isSupportedCurrency("GBP"), true);
  assert.equal(isSupportedCurrency("ZZZ"), false);
});

test("payment setup is required only for positive-price public sales", () => {
  assert.equal(
    hasPaidPublicSale([
      { currency: "GBP", price: "0.00" },
      { currency: "JPY", price: "0" },
    ]),
    false,
  );
  assert.equal(
    hasPaidPublicSale([
      { currency: "GBP", price: "0.00" },
      { currency: "GBP", price: "12.50" },
    ]),
    true,
  );
  assert.equal(
    hasPaidPublicSale([{ currency: "GBP", price: "invalid" }]),
    false,
  );
  assert.equal(
    hasPaidPublicSale([
      { currency: "GBP", price: "999999999999999999999999.00" },
    ]),
    false,
  );

  const free = buildLaunchpadReadiness({
    hasStudioProfile: true,
    hasRooms: true,
    hasClassTypes: true,
    hasInstructors: true,
    hasValidPricing: true,
    hasFutureBookableClass: true,
    hasPublishedBookingSurface: true,
    paidPublicSalesEnabled: false,
    paymentProviderReady: false,
  });
  assert.equal(free.paymentProviderRequired, false);
  assert.equal(free.goLive.ready, true);
  assert.equal(free.goLive.total, 2);

  const paid = buildLaunchpadReadiness({
    ...free,
    paidPublicSalesEnabled: true,
    paymentProviderReady: false,
  });
  assert.equal(paid.paymentProviderRequired, true);
  assert.equal(paid.goLive.ready, false);
  assert.equal(paid.goLive.total, 3);
});

test("foundational setup and go-live readiness remain separate", () => {
  const readiness = buildLaunchpadReadiness({
    hasStudioProfile: true,
    hasRooms: true,
    hasClassTypes: true,
    hasInstructors: true,
    hasValidPricing: true,
    hasFutureBookableClass: false,
    hasPublishedBookingSurface: false,
    paidPublicSalesEnabled: false,
    paymentProviderReady: false,
  });
  assert.equal(readiness.foundation.ready, true);
  assert.equal(readiness.goLive.ready, false);
  assert.equal(readiness.foundation.percentage, 100);
  assert.equal(readiness.percentage, 71);
});
