import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const router = source("src/features/studio/server/member-portal-router.ts");
const service = source("src/features/studio/server/class-booking-service.ts");
const classesApi = source("src/app/api/v1/classes/route.ts");
const migration = source("drizzle/0054_active_booking_integrity.sql");

describe("member portal booking integrity", () => {
  it("keeps portal issuance and class inventory in the member location", () => {
    assert.match(router, /capability: "customer\.manage"/);
    assert.match(
      router,
      /eq\(clientTable\.locationId, ctx\.locationId\)[\s\S]*?isNull\(clientTable\.locationId\)/,
    );
    assert.match(router, /createClassBooking/);
    assert.match(router, /locationId: client\.locationId/);
  });

  it("serializes capacity checks and rejects duplicate active bookings", () => {
    assert.match(service, /db\.transaction/);
    assert.match(service, /StudioClass[\s\S]*FOR UPDATE/);
    assert.match(service, /count\(\*\)::int/);
    assert.match(
      service,
      /inArray\(studioBooking\.status, occupiedStudioBookingStatuses\)/,
    );
    assert.match(migration, /duplicate groups require reconciliation/);
    assert.match(migration, /StudioBooking_active_class_client_key/);
    assert.match(migration, /WHERE status IN \('BOOKED', 'ATTENDED'\)/);
  });

  it("reports public API capacity from the same occupied booking states", () => {
    assert.match(classesApi, /occupiedStudioBookingStatuses/);
    assert.match(
      classesApi,
      /inArray\(studioBooking\.status, occupiedStudioBookingStatuses\)/,
    );
    assert.match(classesApi, /Math\.max\(0, c\.maxCapacity - c\.bookedCount\)/);
  });
});
