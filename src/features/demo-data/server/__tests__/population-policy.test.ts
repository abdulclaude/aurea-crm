import assert from "node:assert/strict";
import test from "node:test";

import {
  existingDemoProductDataTotal,
  populateDemoDataInputSchema,
} from "@/features/demo-data/contracts";

test("other locations do not count as existing product data", () => {
  assert.equal(
    existingDemoProductDataTotal({
      clients: 0,
      organizationLoyaltyPrograms: 0,
      siblingLocations: 3,
    }),
    0,
  );
});

test("existing product data remains visible for explicit opt-in", () => {
  assert.equal(
    existingDemoProductDataTotal({
      clients: 2,
      organizationLoyaltyPrograms: 1,
      siblingLocations: 3,
    }),
    3,
  );
});

test("population requires an explicit existing-data opt-in by default", () => {
  const input = populateDemoDataInputSchema.parse({
    profile: "SHOWCASE",
    confirmation: "POPULATE Demo Studio",
    idempotencyKey: "population-request",
  });

  assert.equal(input.allowExistingData, false);
});
