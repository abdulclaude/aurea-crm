import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countAudienceFilters,
  createEmptyAudienceDefinition,
  savedAudienceDefinitionSchema,
} from "../audience-definition";

describe("saved audience definitions", () => {
  it("supports a free-but-not-paid audience without client-specific policy", () => {
    const definition = savedAudienceDefinitionSchema.parse({
      ...createEmptyAudienceDefinition(),
      operator: "AND",
      tags: { mode: "ANY", values: ["free-resource"] },
      commerce: {
        paymentState: "NEVER_PAID",
        minimumLifetimeSpend: null,
      },
    });

    assert.equal(definition.version, 2);
    assert.equal(definition.commerce.paymentState, "NEVER_PAID");
    assert.equal(countAudienceFilters(definition), 2);
  });

  it("supports active members who have not visited recently", () => {
    const definition = savedAudienceDefinitionSchema.parse({
      ...createEmptyAudienceDefinition(),
      membership: { statuses: ["ACTIVE"], planIds: ["plan-a"] },
      attendance: {
        minimumVisits: 1,
        maximumVisits: null,
        noVisitInDays: 30,
        hasUpcomingBooking: false,
      },
      emailEligibility: "ELIGIBLE",
    });

    assert.deepEqual(definition.membership.statuses, ["ACTIVE"]);
    assert.equal(definition.attendance.noVisitInDays, 30);
    assert.equal(countAudienceFilters(definition), 6);
  });

  it("upgrades legacy timestamps to location-date filters", () => {
    const definition = savedAudienceDefinitionSchema.parse({
      version: 1,
      operator: "AND",
      search: "",
      types: ["CUSTOMER"],
      lifecycleStages: [],
      acquisitionStages: [],
      tags: { mode: "ALL", values: ["member"] },
      countries: [],
      sources: [],
      assigneeIds: [],
      instructorIds: [],
      createdAt: null,
      lastInteractionAt: { from: "2026-06-01T00:00:00.000Z" },
    });

    assert.equal(definition.version, 2);
    assert.deepEqual(definition.lastInteractionAt, { from: "2026-06-01" });
    assert.equal(definition.emailEligibility, "ANY");
  });

  it("allows an empty definition to represent everyone in the active scope", () => {
    const definition = savedAudienceDefinitionSchema.parse(
      createEmptyAudienceDefinition(),
    );
    assert.equal(countAudienceFilters(definition), 0);
  });

  it("rejects invalid ranges, duplicate references, and unknown policy", () => {
    assert.equal(
      savedAudienceDefinitionSchema.safeParse({
        ...createEmptyAudienceDefinition(),
        createdAt: { from: "2026-07-02", to: "2026-07-01" },
      }).success,
      false,
    );
    assert.equal(
      savedAudienceDefinitionSchema.safeParse({
        ...createEmptyAudienceDefinition(),
        membership: {
          statuses: ["ACTIVE"],
          planIds: ["plan-a", "plan-a"],
        },
      }).success,
      false,
    );
    assert.equal(
      savedAudienceDefinitionSchema.safeParse({
        ...createEmptyAudienceDefinition(),
        clientSlug: "special-customer",
      }).success,
      false,
    );
  });
});
