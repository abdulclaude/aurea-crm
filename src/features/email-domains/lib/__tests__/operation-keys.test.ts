import assert from "node:assert/strict";
import test from "node:test";

import { buildEmailDomainCreateIdempotencyKey } from "@/features/email-domains/lib/operation-keys";

test("uses one stable create key per domain registration", () => {
  assert.equal(
    buildEmailDomainCreateIdempotencyKey("domain_generation_1"),
    "resend-domain:create:domain_generation_1",
  );
  assert.equal(
    buildEmailDomainCreateIdempotencyKey("domain_generation_1"),
    buildEmailDomainCreateIdempotencyKey("domain_generation_1"),
  );
});

test("allows the same domain name to be registered again after deletion", () => {
  assert.notEqual(
    buildEmailDomainCreateIdempotencyKey("domain_generation_1"),
    buildEmailDomainCreateIdempotencyKey("domain_generation_2"),
  );
});
