import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(
    process.cwd(),
    "drizzle",
    "0056_cancellation_integrity_hardening.sql",
  ),
  "utf8",
);

test("cancellation integrity migration binds policy, credit, and payment scope", () => {
  assert.match(migration, /CancellationPolicy_scope_location_fkey/);
  assert.match(migration, /StudioClass_validate_cancellation_policy_scope/);
  assert.match(
    migration,
    /credit_scope\."clientId" <> charge_scope\."clientId"/,
  );
  assert.match(migration, /operation_scope\."type" <> 'PAYMENT'/);
  assert.match(migration, /operation_scope\."provider" <> 'STRIPE'/);
  assert.match(
    migration,
    /operation_scope\."providerAccountId" IS DISTINCT FROM connection_scope\."stripeAccountId"/,
  );
  assert.match(
    migration,
    /operation_scope\."amountMinor"::numeric <> NEW\."amount" \* power/,
  );
});
