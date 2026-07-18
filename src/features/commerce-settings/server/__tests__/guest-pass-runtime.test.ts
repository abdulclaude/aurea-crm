import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  assertGuestPassApprovable,
  assertGuestPassRedeemable,
  buildGuestPassIssueDecision,
} from "../guest-pass-runtime-policy";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("guest-pass runtime", () => {
  it("enforces exact nullable scope for pass bindings", () => {
    const migration = source("drizzle/0088_guest_pass_runtime.sql");
    assert.match(migration, /CommerceGuestPassPolicyVersion_exact_scope_id_key/);
    assert.match(migration, /CommerceGuestPass_exact_scope_id_key/);
    assert.match(
      migration,
      /FOREIGN KEY \("organizationId", "scopeKey", "policyVersionId"\)/,
    );
    assert.match(
      migration,
      /FOREIGN KEY \("organizationId", "scopeKey", "guestPassId"\)/,
    );
    assert.match(migration, /CommerceGuestPass_owner_scope_integrity/);
    assert.match(migration, /Client_guest_pass_owner_scope_protect/);
    assert.match(migration, /IS NOT DISTINCT FROM NEW\."locationId"/);
    assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN/);
  });

  it("resolves materially different location policies into immutable snapshots", () => {
    const issuedAt = new Date("2026-07-18T10:00:00.000Z");
    const northPolicy = {
      enabled: true,
      passesPerMember: 2,
      validityDays: 7,
      requiresApproval: true,
    };
    const north = buildGuestPassIssueDecision({
      policyId: "policy-north-v3",
      policyVersion: 3,
      policy: northPolicy,
      outstandingPasses: 1,
      issuedAt,
    });
    assert.equal(north.status, "PENDING_APPROVAL");
    assert.equal(north.expiresAt.toISOString(), "2026-07-25T10:00:00.000Z");
    northPolicy.validityDays = 99;
    assert.deepEqual(north.policySnapshot, {
      policyVersionId: "policy-north-v3",
      version: 3,
      values: {
        enabled: true,
        passesPerMember: 2,
        validityDays: 7,
        requiresApproval: true,
      },
    });

    const south = buildGuestPassIssueDecision({
      policyId: "policy-south-v1",
      policyVersion: 1,
      policy: {
        enabled: true,
        passesPerMember: 5,
        validityDays: 30,
        requiresApproval: false,
      },
      outstandingPasses: 0,
      issuedAt,
    });
    assert.equal(south.status, "ACTIVE");
    assert.equal(south.expiresAt.toISOString(), "2026-08-17T10:00:00.000Z");
  });

  it("rejects disabled and exhausted policies", () => {
    assert.throws(
      () =>
        buildGuestPassIssueDecision({
          policyId: "disabled",
          policyVersion: 1,
          policy: {
            enabled: false,
            passesPerMember: 2,
            validityDays: 7,
            requiresApproval: false,
          },
          outstandingPasses: 0,
          issuedAt: new Date(),
        }),
      /Guest passes are disabled/,
    );
    assert.throws(
      () =>
        buildGuestPassIssueDecision({
          policyId: "quota",
          policyVersion: 1,
          policy: {
            enabled: true,
            passesPerMember: 1,
            validityDays: 7,
            requiresApproval: false,
          },
          outstandingPasses: 1,
          issuedAt: new Date(),
        }),
      /reached their guest-pass quota/,
    );
  });

  it("enforces approval, expiry, status, and remaining-use checks", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    assert.doesNotThrow(() =>
      assertGuestPassApprovable(
        {
          status: "PENDING_APPROVAL",
          expiresAt: new Date("2026-07-19T10:00:00.000Z"),
        },
        now,
      ),
    );
    assert.throws(
      () =>
        assertGuestPassApprovable(
          { status: "PENDING_APPROVAL", expiresAt: now },
          now,
        ),
      /expired before it was approved/,
    );
    assert.throws(
      () =>
        assertGuestPassRedeemable(
          {
            status: "PENDING_APPROVAL",
            expiresAt: new Date("2026-07-19T10:00:00.000Z"),
            usedCount: 0,
            allowedUses: 1,
          },
          now,
        ),
      /still needs approval/,
    );
    assert.throws(
      () =>
        assertGuestPassRedeemable(
          {
            status: "ACTIVE",
            expiresAt: now,
            usedCount: 0,
            allowedUses: 1,
          },
          now,
        ),
      /has expired/,
    );
    assert.throws(
      () =>
        assertGuestPassRedeemable(
          {
            status: "ACTIVE",
            expiresAt: new Date("2026-07-19T10:00:00.000Z"),
            usedCount: 1,
            allowedUses: 1,
          },
          now,
        ),
      /no remaining uses/,
    );
    assert.doesNotThrow(() =>
      assertGuestPassRedeemable(
        {
          status: "ACTIVE",
          expiresAt: new Date("2026-07-19T10:00:00.000Z"),
          usedCount: 0,
          allowedUses: 1,
        },
        now,
      ),
    );
  });

  it("serializes issue quota and binds exact active policy snapshots", () => {
    const service = source(
      "src/features/commerce-settings/server/guest-pass-runtime-service.ts",
    );
    assert.match(service, /pg_advisory_xact_lock/);
    assert.match(
      service,
      /commerceGuestPassPolicyVersion\.isActive, true/,
    );
    assert.match(service, /exactCommerceSettingsLocation/);
    assert.match(service, /findPassByIdempotencyKey/);
    assert.match(service, /policyVersionId: activePolicy\.id/);
    assert.match(service, /policySnapshot: decision\.policySnapshot/);
    assert.match(service, /inArray\([\s\S]*"PENDING_APPROVAL", "ACTIVE"/);
    assert.match(service, /gt\(commerceGuestPass\.expiresAt, now\)/);
  });

  it("locks redemption rows and uses idempotent concurrency predicates", () => {
    const lifecycle = source(
      "src/features/commerce-settings/server/guest-pass-lifecycle-service.ts",
    );
    assert.match(lifecycle, /CommerceGuestPass[\s\S]*FOR UPDATE/);
    assert.ok(
      lifecycle.match(/findRedemptionByIdempotencyKey/g)?.length === 3,
    );
    assert.match(lifecycle, /eq\(commerceGuestPass\.status, "ACTIVE"\)/);
    assert.match(
      lifecycle,
      /eq\(commerceGuestPass\.usedCount, pass\.usedCount\)/,
    );
    assert.match(
      lifecycle,
      /usedCount\} < \$\{commerceGuestPass\.allowedUses/,
    );
    assert.match(lifecycle, /gt\(commerceGuestPass\.expiresAt, now\)/);
    assert.match(lifecycle, /redeemedById: input\.actorUserId/);
    assert.match(lifecycle, /approvedById: input\.actorUserId/);
    assert.match(lifecycle, /revokedById: input\.actorUserId/);
    assert.ok(
      lifecycle.match(/replay\.locationId !== input\.scope\.locationId/g)
        ?.length === 1,
    );
  });

  it("uses commerce permissions and renders persisted member passes", () => {
    const router = source("src/features/commerce-settings/server/router.ts");
    const view = source(
      "src/features/crm/components/member-guest-passes-view.tsx",
    );
    assert.match(router, /listGuestPasses[\s\S]*"commerce\.view"/);
    assert.match(router, /issueGuestPass[\s\S]*"commerce\.manage"/);
    assert.match(router, /redeemGuestPass[\s\S]*"commerce\.manage"/);
    assert.match(view, /commerceSettings\.listGuestPasses\.queryOptions/);
    assert.doesNotMatch(view, /const rows: GuestPassRow\[\] = \[\]/);
  });
});
