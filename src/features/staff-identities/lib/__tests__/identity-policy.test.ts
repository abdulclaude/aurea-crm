import assert from "node:assert/strict";
import test from "node:test";

import {
  canAttachIdentityUser,
  isStaffIdentityAccessBlocked,
  normalizeStaffIdentityEmail,
} from "@/features/staff-identities/lib/identity-policy";

test("normalizes staff email without inventing an identity key", () => {
  assert.equal(
    normalizeStaffIdentityEmail(" Staff@Example.COM "),
    "staff@example.com",
  );
  assert.equal(normalizeStaffIdentityEmail(""), null);
  assert.equal(normalizeStaffIdentityEmail(null), null);
});

test("blocks capabilities for suspended or archived identities", () => {
  assert.equal(isStaffIdentityAccessBlocked([null, "ACTIVE"]), false);
  assert.equal(isStaffIdentityAccessBlocked(["INVITED"]), false);
  assert.equal(isStaffIdentityAccessBlocked(["SUSPENDED", "ACTIVE"]), true);
  assert.equal(isStaffIdentityAccessBlocked(["ARCHIVED"]), true);
});

test("prevents two authenticated users from sharing one staff identity", () => {
  assert.equal(
    canAttachIdentityUser({ identityUserId: "user-a", sourceUserId: "user-b" }),
    false,
  );
  assert.equal(
    canAttachIdentityUser({ identityUserId: "user-a", sourceUserId: "user-a" }),
    true,
  );
  assert.equal(
    canAttachIdentityUser({ identityUserId: null, sourceUserId: "user-a" }),
    true,
  );
});
