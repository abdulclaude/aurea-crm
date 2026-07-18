import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_DATA_PROFILE_CONFIG } from "@/features/demo-data/contracts";
import {
  assertCoreOperationsFixtureInvariants,
  buildCoreOperationsFixturePlan,
} from "@/features/demo-data/server/packs/core-operations-pack";
import type { DemoSeedContext } from "@/features/demo-data/server/types";

function context(profile: "SHOWCASE" | "QA_EXHAUSTIVE"): DemoSeedContext {
  return {
    organizationId: "organization-demo",
    locationId: "location-demo",
    actorUserId: "user-real-actor",
    currency: "GBP",
    timezone: "Europe/London",
    referenceDate: new Date("2026-07-14T12:00:00.000Z"),
    runId: `run-${profile.toLowerCase()}`,
    profile,
    profileConfig: DEMO_DATA_PROFILE_CONFIG[profile],
  };
}

function dependencies(clientCount: number, instructorCount: number) {
  return {
    clients: Array.from({ length: clientCount }, (_, index) => ({
      id: `client-${index + 1}`,
      name: `Demo Client ${index + 1}`,
      email: `client.${index + 1}@example.test`,
    })),
    instructors: Array.from({ length: instructorCount }, (_, index) => ({
      id: `instructor-${index + 1}`,
      name: `Demo Instructor ${index + 1}`,
      email: `instructor.${index + 1}@example.test`,
    })),
  };
}

function values<T extends string>(rows: ReadonlyArray<T>): Set<T> {
  return new Set(rows);
}

test("showcase fixtures cross route page thresholds and cover operational states", () => {
  const seedContext = context("SHOWCASE");
  const seedDependencies = dependencies(150, 10);
  const plan = buildCoreOperationsFixturePlan(seedContext, seedDependencies);

  assert.equal(plan.pipelines.length, 2);
  assert.equal(plan.deals.length, 48);
  assert.equal(plan.tasks.length, 60);
  assert.equal(plan.notes.length, 96);
  assert.equal(plan.households.length, 24);
  assert.equal(plan.householdMembers.length, 72);
  assert.equal(plan.rotas.length, 320);
  assert.equal(plan.timeLogs.length, 220);
  assert.equal(plan.payrollRuns.length, 7);
  assert.equal(plan.payrollDetails.length, 70);
  assert.ok(plan.dealClients.length > plan.deals.length);
  assert.ok(plan.activities.length > plan.deals.length);

  assert.deepEqual(values(plan.tasks.map((row) => row.status)), new Set(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]));
  assert.deepEqual(values(plan.tasks.map((row) => row.priority)), new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]));
  assert.deepEqual(values(plan.rotas.map((row) => row.status)), new Set(["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]));
  assert.deepEqual(values(plan.timeLogs.map((row) => row.status)), new Set(["APPROVED", "SUBMITTED", "DRAFT", "REJECTED", "INVOICED"]));
  assert.deepEqual(values(plan.timeOffRequests.map((row) => row.status)), new Set(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]));
  assert.deepEqual(values(plan.shiftSwaps.map((row) => row.status)), new Set([
    "PENDING",
    "INSTRUCTOR_ACCEPTED",
    "INSTRUCTOR_REJECTED",
    "ADMIN_APPROVED",
    "ADMIN_REJECTED",
    "CANCELLED",
    "EXPIRED",
  ]));
  assert.deepEqual(values(plan.payrollRuns.map((row) => row.status)), new Set([
    "COMPLETED",
    "PROCESSING",
    "APPROVED",
    "PENDING_APPROVAL",
    "FAILED",
    "CANCELLED",
    "DRAFT",
  ]));
  assert.deepEqual(values(plan.instructorPayments.map((row) => row.paymentStatus)), new Set([
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
  ]));
  assert.deepEqual(values(plan.staffIdentities.map((row) => row.status)), new Set([
    "ACTIVE",
    "INVITED",
    "SUSPENDED",
    "ARCHIVED",
  ]));
  assert.doesNotThrow(() => assertCoreOperationsFixtureInvariants(plan, seedContext, seedDependencies));
});

test("QA fixtures materially increase pagination and long-range data without changing scope", () => {
  const seedContext = context("QA_EXHAUSTIVE");
  const seedDependencies = dependencies(600, 24);
  const plan = buildCoreOperationsFixturePlan(seedContext, seedDependencies);

  assert.equal(plan.pipelines.length, 4);
  assert.equal(plan.deals.length, 180);
  assert.equal(plan.tasks.length, 240);
  assert.equal(plan.notes.length, 400);
  assert.equal(plan.households.length, 72);
  assert.equal(plan.rotas.length, 1_600);
  assert.equal(plan.timeLogs.length, 2_400);
  assert.equal(plan.payrollRuns.length, 26);
  assert.equal(plan.payrollDetails.length, 624);
  assert.ok(plan.instructorPayments.length > 500);
  assert.ok(plan.activities.length > 300);

  for (const row of plan.deals) {
    assert.equal(row.organizationId, seedContext.organizationId);
    assert.equal(row.locationId, seedContext.locationId);
    assert.equal(row.currency, seedContext.currency);
  }
  for (const row of plan.timeLogs) {
    assert.equal(row.organizationId, seedContext.organizationId);
    assert.equal(row.locationId, seedContext.locationId);
    assert.equal(row.currency, seedContext.currency);
  }
  assert.ok(plan.timeLogs.some((row) => row.startTime < new Date("2024-08-01T00:00:00.000Z")));
  assert.doesNotThrow(() => assertCoreOperationsFixtureInvariants(plan, seedContext, seedDependencies));
});

test("core operations fixtures reject missing relational dependencies", () => {
  const seedContext = context("SHOWCASE");
  assert.throws(
    () => buildCoreOperationsFixturePlan(seedContext, dependencies(2, 10)),
    /at least three clients/,
  );
  assert.throws(
    () => buildCoreOperationsFixturePlan(seedContext, dependencies(150, 0)),
    /at least one instructor/,
  );
});
