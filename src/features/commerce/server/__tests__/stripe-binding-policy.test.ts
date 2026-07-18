import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  stripeBindingCandidateFailure,
  stripeBindingReferenceFailure,
} from "../../lib/stripe-binding-policy";

const historicalConnection = {
  id: "connection_old",
  organizationId: "organization_1",
  locationId: "location_1",
  stripeAccountId: "acct_old",
  accountType: "express",
};

test("platform-null events retain the stored historical account binding", () => {
  assert.equal(
    stripeBindingCandidateFailure({
      expected: {
        stripeConnectionId: "connection_old",
        organizationId: "organization_1",
        locationId: "location_1",
        providerAccountId: "acct_old",
      },
      candidate: historicalConnection,
      eventAccountId: null,
    }),
    null,
  );
});

test("an account rotation cannot replace a historical binding", () => {
  assert.equal(
    stripeBindingCandidateFailure({
      expected: {
        stripeConnectionId: "connection_old",
        organizationId: "organization_1",
        locationId: "location_1",
        providerAccountId: "acct_old",
      },
      candidate: {
        ...historicalConnection,
        id: "connection_current",
        stripeAccountId: "acct_current",
      },
      eventAccountId: null,
    }),
    "STRIPE_ACCOUNT_SCOPE_MISMATCH",
  );
});

test("connected-account envelope mismatches fail closed", () => {
  assert.equal(
    stripeBindingCandidateFailure({
      expected: {
        stripeConnectionId: "connection_old",
        organizationId: "organization_1",
        locationId: "location_1",
        providerAccountId: "acct_old",
      },
      candidate: historicalConnection,
      eventAccountId: "acct_other",
    }),
    "STRIPE_EVENT_ACCOUNT_MISMATCH",
  );
});

test("operation-less and snapshot-less checkouts are unbound", () => {
  assert.equal(
    stripeBindingReferenceFailure(
      { stripeConnectionId: null, providerAccountId: null },
      true,
    ),
    "STRIPE_ACCOUNT_UNBOUND",
  );
  assert.equal(
    stripeBindingReferenceFailure(
      { stripeConnectionId: "connection_old", providerAccountId: null },
      true,
    ),
    "STRIPE_ACCOUNT_UNBOUND",
  );
});

test("migration backfills exact bindings and blocks ambiguous history", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "drizzle/0033_stripe_historical_account_binding.sql",
    ),
    "utf8",
  );

  assert.match(migration, /CommerceOperation_stripeConnection_scope_fkey/);
  assert.match(
    migration,
    /locationId" IS NOT DISTINCT FROM connection\."locationId/,
  );
  assert.match(migration, /ambiguous account ownership/);
  assert.match(migration, /StudioMembership_stripeSubscriptionId_key/);
  assert.match(migration, /Instructor_stripeAccountId_key/);
  assert.match(migration, /StripeEvent_stripeEventId_source_key/);
  assert.match(
    migration,
    /StripeConnection_organizationId_locationId_fkey[\s\S]*FOREIGN KEY \("organizationId", "locationId"\)/,
  );
  assert.match(migration, /CommerceOperation_exact_stripe_scope/);
  assert.match(migration, /CommerceLedgerEntry_exact_stripe_scope/);
  assert.match(migration, /StripeEvent_exact_stripe_scope/);
  assert.match(migration, /CommerceOperation_stripe_binding_check/);
  assert.match(migration, /CommerceLedgerEntry_stripe_binding_check/);
  assert.match(migration, /StripeEvent_processed_binding_check/);
  assert.match(
    migration,
    /snapshot_stripe_account_id IS DISTINCT FROM bound_stripe_account_id/,
  );
  assert.match(migration, /CommerceLedgerEntry_exact_instructor_stripe_scope/);
  assert.match(migration, /StripeEvent_exact_instructor_stripe_scope/);
  assert.match(migration, /StripeConnection_immutable_identity/);
  assert.match(migration, /Instructor_immutable_stripe_account_identity/);
  assert.match(migration, /ON DELETE RESTRICT ON UPDATE CASCADE/);
});

test("Stripe event ids are globally idempotent across webhook routes", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "drizzle/0063_global_stripe_event_idempotency.sql",
    ),
    "utf8",
  );

  assert.match(migration, /GROUP BY "stripeEventId"/);
  assert.match(migration, /StripeEvent_stripeEventId_key/);
  assert.doesNotMatch(
    migration,
    /UNIQUE INDEX[\s\S]*\("stripeEventId", "source"\)/,
  );
});

test("operation-less webhook compatibility cannot infer a current account", () => {
  const resolver = readFileSync(
    path.join(
      process.cwd(),
      "src/features/commerce/server/stripe/resolve-checkout-scope.ts",
    ),
    "utf8",
  );

  assert.match(resolver, /STRIPE_OPERATION_UNBOUND/);
  assert.doesNotMatch(resolver, /createLegacyStripeOperation/);
  assert.doesNotMatch(resolver, /isActive/);
});
