import assert from "node:assert/strict";
import test from "node:test";

import {
  guestPassPolicyValuesSchema,
  taxAssignmentValuesSchema,
  taxRateValuesSchema,
} from "@/features/commerce-settings/contracts";

test("tax definitions use basis points and bounded codes", () => {
  assert.equal(
    taxRateValuesSchema.safeParse({
      name: "VAT",
      code: "VAT_STANDARD",
      rateBasisPoints: 2_000,
      kind: "EXCLUSIVE",
      description: null,
    }).success,
    true,
  );
  assert.equal(
    taxRateValuesSchema.safeParse({
      name: "VAT",
      code: "vat",
      rateBasisPoints: 2_000,
      kind: "EXCLUSIVE",
      description: null,
    }).success,
    false,
  );
});

test("tax assignments cannot mix line and product targets", () => {
  assert.equal(
    taxAssignmentValuesSchema.safeParse({
      subjectType: "LINE_TYPE",
      lineType: "MEMBERSHIP",
      productId: null,
      taxRateId: null,
    }).success,
    true,
  );
  assert.equal(
    taxAssignmentValuesSchema.safeParse({
      subjectType: "PRODUCT",
      lineType: "MEMBERSHIP",
      productId: "product_1",
      taxRateId: null,
    }).success,
    false,
  );
});

test("guest-pass versions describe a bounded historical policy", () => {
  assert.equal(
    guestPassPolicyValuesSchema.safeParse({
      enabled: true,
      passesPerMember: 2,
      validityDays: 14,
      requiresApproval: false,
    }).success,
    true,
  );
  assert.equal(
    guestPassPolicyValuesSchema.safeParse({
      enabled: true,
      passesPerMember: 101,
      validityDays: 14,
      requiresApproval: false,
    }).success,
    false,
  );
});
