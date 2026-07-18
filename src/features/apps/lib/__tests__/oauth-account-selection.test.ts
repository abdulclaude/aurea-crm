import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  redactOAuthAccountIdentifier,
  selectOAuthAccountBinding,
  selectOAuthCatalogAccount,
} from "../oauth-account-selection";

const linkedA = { id: "linked-a", accountId: "external-a", scopes: [] };
const linkedB = { id: "linked-b", accountId: "external-b", scopes: [] };
const accountA = {
  id: "provider-a",
  externalAccountId: "external-a",
  grant: { oauthAccountId: "linked-a" },
};

describe("OAuth account selection", () => {
  it("keeps the single-account setup path", () => {
    assert.deepEqual(
      selectOAuthAccountBinding({
        scopedAccounts: [],
        linkedAccounts: [linkedA],
      }),
      { kind: "new", linkedAccount: linkedA },
    );
  });

  it("reconnects an existing account by stable provider account ID", () => {
    assert.deepEqual(
      selectOAuthAccountBinding({
        scopedAccounts: [accountA],
        linkedAccounts: [linkedA, linkedB],
        providerAccountId: accountA.id,
      }),
      { kind: "existing", account: accountA, linkedAccount: linkedA },
    );
  });

  it("creates a separate account for an explicitly selected unbound identity", () => {
    assert.deepEqual(
      selectOAuthAccountBinding({
        scopedAccounts: [accountA],
        linkedAccounts: [linkedA, linkedB],
        linkedAccountId: linkedB.id,
      }),
      { kind: "new", linkedAccount: linkedB },
    );
  });

  it("never retargets an existing account to another external identity", () => {
    assert.deepEqual(
      selectOAuthAccountBinding({
        scopedAccounts: [accountA],
        linkedAccounts: [linkedA, linkedB],
        providerAccountId: accountA.id,
        linkedAccountId: linkedB.id,
      }),
      { kind: "ambiguous" },
    );
  });

  it("requires an explicit choice for multiple unbound identities", () => {
    assert.deepEqual(
      selectOAuthAccountBinding({
        scopedAccounts: [],
        linkedAccounts: [linkedA, linkedB],
      }),
      { kind: "ambiguous" },
    );
  });

  it("redacts identifiers used as UI hints", () => {
    assert.equal(
      redactOAuthAccountIdentifier("person@example.com"),
      "p***@example.com",
    );
    assert.equal(
      redactOAuthAccountIdentifier("123456789"),
      "Account ending 6789",
    );
  });

  it("keeps an exact disconnected account from falling back to an inherited account", () => {
    const inherited = {
      id: "organization-account",
      locationId: null,
      inheritToLocations: true,
      isDefault: true,
    };
    const exact = {
      id: "location-account",
      locationId: "location-a",
      inheritToLocations: false,
      isDefault: true,
    };

    assert.equal(
      selectOAuthCatalogAccount([inherited, exact], "location-a")?.id,
      exact.id,
    );
  });

  it("uses an explicitly inheritable organization account only without a location override", () => {
    const disabled = {
      id: "not-inherited",
      locationId: null,
      inheritToLocations: false,
      isDefault: true,
    };
    const inherited = {
      id: "inherited",
      locationId: null,
      inheritToLocations: true,
      isDefault: false,
    };

    assert.equal(
      selectOAuthCatalogAccount([disabled, inherited], "location-a")?.id,
      inherited.id,
    );
  });
});
