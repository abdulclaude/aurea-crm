import assert from "node:assert/strict";
import test from "node:test";

import { staffOperationsPolicyValuesSchema } from "@/features/staff-settings/contracts";

const validPolicy = {
  publicInstructorProfilesByDefault: false,
  availabilityMode: "AVAILABILITY_REQUIRED" as const,
  staffCanEditAvailability: true,
  shiftSwapRequiresApproval: true,
  timeOffRequiresApproval: true,
  timeClockRoundingMinutes: 5,
  breakRequiredAfterMinutes: 360,
  minimumBreakMinutes: 30,
  timeEntryApprovalMode: "MANAGER_REQUIRED" as const,
};

test("staff operations policy accepts a valid break and approval policy", () => {
  assert.deepEqual(
    staffOperationsPolicyValuesSchema.parse(validPolicy),
    validPolicy,
  );
});

test("staff operations policy rejects orphaned and invalid break requirements", () => {
  assert.equal(
    staffOperationsPolicyValuesSchema.safeParse({
      ...validPolicy,
      breakRequiredAfterMinutes: null,
      minimumBreakMinutes: 30,
    }).success,
    false,
  );
  assert.equal(
    staffOperationsPolicyValuesSchema.safeParse({
      ...validPolicy,
      breakRequiredAfterMinutes: 30,
      minimumBreakMinutes: 30,
    }).success,
    false,
  );
});
