import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const service = source(
  "src/features/studio/server/member-checkin-service.ts",
);
const router = source("src/features/studio/server/checkin-router.ts");
const page = source(
  "src/app/(dashboard)/(rest)/studio/check-in/page.tsx",
);
const migration = source("drizzle/0052_checkin_scope_integrity.sql");
const capabilities = source("src/features/permissions/capabilities.ts");
const roleMatrix = source("src/features/permissions/role-matrix.ts");
const memberPortal = source(
  "src/features/studio/server/member-portal-router.ts",
);
const passDialog = source(
  "src/features/studio/components/check-in-pass-dialog.tsx",
);

describe("member check-in integrity", () => {
  it("makes class attendance idempotent and rejects historical scope conflicts", () => {
    assert.match(migration, /duplicate groups require reconciliation/);
    assert.match(migration, /rows have mismatched tenant scope/);
    assert.match(migration, /CheckIn_classId_clientId_key/);
    assert.match(migration, /CheckIn_exact_scope_guard/);
    assert.match(migration, /CheckIn_organizationId_classId_fkey/);
    assert.match(migration, /CheckIn_organizationId_clientId_fkey/);
  });

  it("updates attendance, booking, and intro usage in one scoped transaction", () => {
    assert.match(service, /return db\.transaction/);
    assert.match(service, /eq\(studioClass\.organizationId, input\.organizationId\)/);
    assert.match(service, /eq\(client\.organizationId, input\.organizationId\)/);
    assert.match(service, /exactLocation\(client\.locationId, targetClass\.locationId\)/);
    assert.match(service, /onConflictDoNothing/);
    assert.match(service, /targetClass\.endTime <= now/);
    assert.match(service, /booking\.status !== "BOOKED"/);
    assert.match(service, /gte\(introOfferRedemption\.expiresAt, now\)/);
    assert.match(service, /offer\.allowedClassTypes\.includes\(targetClass\.classTypeId\)/);
    assert.match(service, /inArray\(introOfferRedemption\.id, offerIds\)/);
    assert.doesNotMatch(service, /for \(const .*Offer/);
  });

  it("uses one service for manual and QR paths and exposes valid roster actions", () => {
    assert.equal(router.match(/performMemberCheckIn\(\{/g)?.length, 2);
    assert.match(router, /exactLocation\(checkIn\.locationId, targetClass\.locationId\)/);
    assert.match(router, /booking\.studioClass\.locationId !== ctx\.locationId/);
    assert.match(page, /selectedClassEnded \? \(/);
    assert.match(page, /No show/);
    assert.match(page, /Check in/);
  });

  it("requires an explicit attendance capability for every mutating path", () => {
    assert.match(capabilities, /"attendance\.manage"/);
    assert.match(roleMatrix, /STANDARD:[\s\S]*?"attendance\.manage"/);
    assert.equal(
      router.match(/requireAttendanceAccess\(ctx, "attendance\.manage"\)/g)
        ?.length,
      3,
    );
    assert.equal(
      router.match(/requireAttendanceAccess\(ctx, "schedule\.view"\)/g)?.length,
      2,
    );
  });

  it("uses a signed member pass instead of accepting a client id as a QR token", () => {
    assert.match(router, /verifyMemberCheckInPass\(input\.qrToken\)/);
    assert.match(router, /memberPass\.organizationId !== organizationId/);
    assert.doesNotMatch(router, /const clientId = input\.qrToken/);
    assert.match(memberPortal, /createMemberCheckInPass\(\{/);
    assert.match(passDialog, /BarcodeDetector/);
    assert.match(passDialog, /navigator\.mediaDevices\.getUserMedia/);
  });
});
