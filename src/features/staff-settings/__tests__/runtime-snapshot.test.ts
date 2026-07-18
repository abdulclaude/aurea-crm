import assert from "node:assert/strict";
import test from "node:test";

import {
  breakComplianceMessage,
  calculateAmount,
  preserveStaffRuntimeSnapshot,
  readStaffRuntimeSnapshot,
  roundDurationMinutes,
  STAFF_RUNTIME_CUSTOM_FIELD,
  stripStaffRuntimeSnapshot,
  type StaffRuntimeSnapshot,
  withStaffRuntimeSnapshot,
} from "@/features/staff-settings/server/runtime-snapshot";

function snapshot(input: {
  location: "north" | "south";
  rate: string;
  rounding: 5 | 15;
  approval: "AUTO_APPROVE" | "MANAGER_REQUIRED";
  capturedAt?: Date;
}): StaffRuntimeSnapshot {
  return {
    schemaVersion: 1,
    capturedAt: input.capturedAt ?? new Date("2026-01-01T09:00:00.000Z"),
    compensation: {
      source: "ASSIGNMENT",
      assignmentId: `assignment-${input.location}`,
      templateId: `template-${input.location}`,
      templateVersionId: `version-${input.location}`,
      templateVersion: 1,
      hourlyRate: input.rate,
      currency: "GBP",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
    },
    operationsPolicy: {
      source: "POLICY_VERSION",
      policyId: `policy-${input.location}`,
      policyVersionId: `policy-version-${input.location}`,
      policyVersion: 1,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      values: {
        publicInstructorProfilesByDefault: false,
        availabilityMode: "ROTA_REQUIRED",
        staffCanEditAvailability: true,
        shiftSwapRequiresApproval: true,
        timeOffRequiresApproval: true,
        timeClockRoundingMinutes: input.rounding,
        breakRequiredAfterMinutes: input.location === "north" ? 300 : 480,
        minimumBreakMinutes: input.location === "north" ? 30 : 45,
        timeEntryApprovalMode: input.approval,
      },
    },
  };
}

test("two location snapshots produce independent pay and time policies", () => {
  const north = snapshot({
    location: "north",
    rate: "20.00",
    rounding: 5,
    approval: "AUTO_APPROVE",
  });
  const south = snapshot({
    location: "south",
    rate: "35.50",
    rounding: 15,
    approval: "MANAGER_REQUIRED",
  });

  assert.equal(roundDurationMinutes(487, 5), 485);
  assert.equal(roundDurationMinutes(487, 15), 480);
  assert.equal(
    calculateAmount(485, 30, north.compensation.hourlyRate),
    "151.67",
  );
  assert.equal(
    calculateAmount(480, 45, south.compensation.hourlyRate),
    "257.38",
  );
  assert.match(
    breakComplianceMessage({
      durationMinutes: 360,
      breakMinutes: 15,
      policy: north.operationsPolicy,
    }) ?? "",
    /30min break required/,
  );
  assert.equal(
    breakComplianceMessage({
      durationMinutes: 360,
      breakMinutes: 15,
      policy: south.operationsPolicy,
    }),
    null,
  );
});

test("a stored snapshot remains immutable when settings later change", () => {
  const original = snapshot({
    location: "north",
    rate: "20.00",
    rounding: 5,
    approval: "AUTO_APPROVE",
  });
  const storedFields = withStaffRuntimeSnapshot(
    { externalReference: "shift-123" },
    original,
  );

  const laterConfiguration = snapshot({
    location: "north",
    rate: "30.00",
    rounding: 15,
    approval: "MANAGER_REQUIRED",
    capturedAt: new Date("2026-02-01T09:00:00.000Z"),
  });
  assert.notDeepEqual(laterConfiguration, original);

  const restored = readStaffRuntimeSnapshot(
    JSON.parse(JSON.stringify(storedFields)) as unknown,
  );
  assert.equal(restored?.compensation.hourlyRate, "20.00");
  assert.equal(restored?.operationsPolicy.values.timeClockRoundingMinutes, 5);
  assert.equal(storedFields.externalReference, "shift-123");
});

test("legacy compensation is explicit instead of a silent rate fallback", () => {
  const legacy: StaffRuntimeSnapshot = {
    ...snapshot({
      location: "north",
      rate: "20.00",
      rounding: 5,
      approval: "MANAGER_REQUIRED",
    }),
    compensation: {
      source: "LEGACY_INSTRUCTOR",
      hourlyRate: "12.50",
      currency: "GBP",
    },
  };

  const restored = readStaffRuntimeSnapshot(
    withStaffRuntimeSnapshot({}, legacy),
  );
  assert.equal(restored?.compensation.source, "LEGACY_INSTRUCTOR");
  assert.equal(restored?.compensation.hourlyRate, "12.50");
});

test("user custom fields cannot inject a forged runtime snapshot", () => {
  const serverSnapshot = snapshot({
    location: "north",
    rate: "20.00",
    rounding: 5,
    approval: "MANAGER_REQUIRED",
  });
  const forgedSnapshot = snapshot({
    location: "south",
    rate: "999.00",
    rounding: 15,
    approval: "AUTO_APPROVE",
  });

  const storedFields = withStaffRuntimeSnapshot(
    {
      externalReference: "shift-123",
      [STAFF_RUNTIME_CUSTOM_FIELD]: forgedSnapshot,
    },
    serverSnapshot,
  );

  assert.equal(storedFields.externalReference, "shift-123");
  assert.equal(
    readStaffRuntimeSnapshot(storedFields)?.compensation.hourlyRate,
    "20.00",
  );
  assert.deepEqual(stripStaffRuntimeSnapshot(storedFields), {
    externalReference: "shift-123",
  });
});

test("custom field patches preserve the server-owned runtime snapshot", () => {
  const serverSnapshot = snapshot({
    location: "north",
    rate: "20.00",
    rounding: 5,
    approval: "MANAGER_REQUIRED",
  });
  const forgedSnapshot = snapshot({
    location: "south",
    rate: "999.00",
    rounding: 15,
    approval: "AUTO_APPROVE",
  });
  const existingFields = withStaffRuntimeSnapshot(
    { externalReference: "shift-123" },
    serverSnapshot,
  );

  const patchedFields = preserveStaffRuntimeSnapshot(existingFields, {
    note: "updated",
    [STAFF_RUNTIME_CUSTOM_FIELD]: forgedSnapshot,
  });

  assert.deepEqual(stripStaffRuntimeSnapshot(patchedFields), {
    note: "updated",
  });
  assert.equal(
    readStaffRuntimeSnapshot(patchedFields)?.compensation.hourlyRate,
    "20.00",
  );

  const deletionAttempt = preserveStaffRuntimeSnapshot(existingFields, {});
  assert.equal(
    readStaffRuntimeSnapshot(deletionAttempt)?.operationsPolicy.values
      .timeEntryApprovalMode,
    "MANAGER_REQUIRED",
  );
});
