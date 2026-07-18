import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("workspace operations settings integrity", () => {
  const router = source("src/features/workspace-settings/server/router.ts");
  const mutation = source(
    "src/features/workspace-settings/server/operations-mutation-service.ts",
  );
  const migration = source("drizzle/0081_workspace_operations_settings.sql");
  const bookings = source("src/features/bookings/server/bookings-router.ts");
  const branding = source("src/features/publications/server/brand-snapshot.ts");
  const bookingCalendar = source(
    "src/features/bookings/components/booking-calendar.tsx",
  );
  const calComService = source(
    "src/features/bookings/server/calcom-webhook-service.ts",
  );
  const calComApplication = source(
    "src/features/bookings/server/calcom-webhook-booking-application.ts",
  );

  it("keeps scope server-derived and separates view from manage capabilities", () => {
    assert.doesNotMatch(router, /organizationId:\s*z\./);
    assert.doesNotMatch(router, /locationId:\s*z\./);
    assert.match(router, /"settings\.view"/);
    assert.match(router, /"settings\.manage"/);
    assert.match(router, /"schedule\.view"/);
  });

  it("serializes append-only versions and handles invalid overrides as tRPC errors", () => {
    assert.match(mutation, /pg_advisory_xact_lock/);
    assert.match(mutation, /code: "CONFLICT"/);
    assert.match(mutation, /input\.expectedVersion/);
    assert.match(
      mutation,
      /max\(workspaceOperationsSettingsVersion\.version\)/,
    );
    assert.match(mutation, /safeParse/);
    assert.match(mutation, /code: "BAD_REQUEST"/);
    assert.doesNotMatch(
      mutation,
      /requiredWorkspaceOperationsValuesSchema\.parse/,
    );
  });

  it("creates tenant-bound defaults with immutable history and RLS", () => {
    assert.match(
      migration,
      /WorkspaceOperationsSettingsVersion_scope_location_fkey/,
    );
    assert.match(migration, /Organization_create_operations_settings/);
    assert.match(
      migration,
      /WorkspaceOperationsSettingsVersion_protect_history/,
    );
    assert.match(migration, /BEFORE UPDATE OR DELETE/);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
    assert.match(migration, /IN \(5, 10, 15, 20, 30, 60\)/);
    assert.doesNotMatch(migration, /DELETE FROM|DROP TABLE|TRUNCATE/);
  });

  it("connects settings to bookings, publication snapshots, and calendar behavior", () => {
    assert.match(bookings, /bookingFitsBusinessHours/);
    assert.match(bookings, /guestBookingPolicyError/);
    assert.match(bookings, /getEffectiveWorkspaceOperationsValues/);
    assert.match(branding, /showPublicEmail/);
    assert.match(branding, /showPublicAddress/);
    assert.match(bookingCalendar, /getScheduleDisplaySettings/);
    assert.match(bookingCalendar, /weekStartsOn=\{weekStartsOn\}/);
    assert.match(
      bookingCalendar,
      /slotMinutes=\{scheduleSettings\?\.slotMinutes/,
    );
    assert.match(calComService, /loadBookingPolicyContext/);
    assert.match(calComApplication, /bookingFitsBusinessHours/);
    assert.match(calComApplication, /policyEvaluation/);
    assert.match(calComApplication, /"EXCEPTION"/);
  });
});
