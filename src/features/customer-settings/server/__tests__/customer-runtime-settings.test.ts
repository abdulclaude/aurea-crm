import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  applyCustomerFieldWrite,
  canonicalizeCustomerTags,
  validateHouseholdRelationship,
} from "../runtime-validation";

const textField = {
  key: "preferred_name",
  label: "Preferred name",
  fieldType: "TEXT" as const,
  isRequired: true,
  options: [],
};

describe("customer runtime settings", () => {
  it("applies materially different location definitions without sharing policy", () => {
    const northMetadata = applyCustomerFieldWrite({
      metadata: { mindbody: { id: "legacy-1" } },
      patch: { preferred_name: "  Abdul  " },
      definitions: [textField],
      requireAllRequired: true,
    });
    assert.deepEqual(northMetadata.customerFields, {
      preferred_name: "Abdul",
    });
    assert.deepEqual(northMetadata.legacy, {
      mindbody: { id: "legacy-1" },
    });
    assert.deepEqual(northMetadata.mindbody, { id: "legacy-1" });
    assert.deepEqual(
      canonicalizeCustomerTags(["vip", "VIP"], [{ name: "VIP" }]),
      ["VIP"],
    );

    const southMetadata = applyCustomerFieldWrite({
      metadata: null,
      patch: { weekly_sessions: "3" },
      definitions: [
        {
          key: "weekly_sessions",
          label: "Weekly sessions",
          fieldType: "NUMBER",
          isRequired: true,
          options: [],
        },
      ],
      requireAllRequired: true,
    });
    assert.deepEqual(southMetadata.customerFields, { weekly_sessions: 3 });
    assert.deepEqual(
      canonicalizeCustomerTags(["member"], [{ name: "Member" }]),
      ["Member"],
    );
    assert.throws(
      () => canonicalizeCustomerTags(["VIP"], [{ name: "Member" }]),
      /Unknown or archived customer tags/,
    );
  });

  it("enforces required fields, types, and canonical select values", () => {
    assert.throws(
      () =>
        applyCustomerFieldWrite({
          metadata: null,
          patch: {},
          definitions: [textField],
          requireAllRequired: true,
        }),
      /Required customer fields are missing: Preferred name/,
    );
    const metadata = applyCustomerFieldWrite({
      metadata: null,
      patch: {
        consented: "false",
        start_date: "2026-07-18",
        goals: ["strength", "MOBILITY", "strength"],
      },
      definitions: [
        {
          key: "consented",
          label: "Consented",
          fieldType: "BOOLEAN",
          isRequired: false,
          options: [],
        },
        {
          key: "start_date",
          label: "Start date",
          fieldType: "DATE",
          isRequired: false,
          options: [],
        },
        {
          key: "goals",
          label: "Goals",
          fieldType: "MULTI_SELECT",
          isRequired: false,
          options: ["Strength", "Mobility"],
        },
      ],
      requireAllRequired: true,
    });
    assert.deepEqual(metadata.customerFields, {
      consented: false,
      start_date: "2026-07-18",
      goals: ["Strength", "Mobility"],
    });
  });

  it("preserves historical archived values but rejects new archived writes", () => {
    const metadata = applyCustomerFieldWrite({
      metadata: {
        customerFields: { archived_field: "historical", preferred_name: "A" },
      },
      patch: { preferred_name: "B" },
      definitions: [textField],
      requireAllRequired: true,
    });
    assert.deepEqual(metadata.customerFields, {
      archived_field: "historical",
      preferred_name: "B",
    });
    assert.throws(
      () =>
        applyCustomerFieldWrite({
          metadata,
          patch: { archived_field: "new value" },
          definitions: [textField],
          requireAllRequired: true,
        }),
      /Unknown or archived customer fields: archived_field/,
    );
  });

  it("accepts only configured household relationship keys", () => {
    const policy = {
      relationships: [
        { key: "guardian", label: "Guardian", reciprocalLabel: "Dependent" },
      ],
      sharedData: ["CONTACT_DETAILS" as const],
      requirePrimaryContactApproval: false,
    };
    assert.equal(validateHouseholdRelationship("guardian", policy), "guardian");
    assert.throws(
      () => validateHouseholdRelationship("parent", policy),
      /Unknown household relationship: parent/,
    );
  });

  it("queries only active definitions at the exact organization/location scope", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/features/customer-settings/server/runtime-settings-service.ts",
      ),
      "utf8",
    );
    assert.match(source, /isNull\(customerFieldDefinition\.archivedAt\)/);
    assert.match(source, /isNull\(customerTagDefinition\.archivedAt\)/);
    assert.match(
      source,
      /exactLocationWhere\(scope\.locationId, customerFieldDefinition\.locationId\)/,
    );
    assert.match(source, /isNull\(customerTagDefinition\.locationId\)/);
  });

  it("gates household contact details and notes with the active policy", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/features/households/server/router.ts"),
      "utf8",
    );
    assert.match(source, /sharedData\.includes\("CONTACT_DETAILS"\)/);
    assert.match(source, /sharedData\.includes\("NOTES"\)/);
    assert.match(source, /notes: canShareNotes \? household\.notes : null/);
    assert.match(source, /currentMember:\s*members\.find/);
  });
});
