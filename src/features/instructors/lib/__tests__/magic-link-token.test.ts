import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  generateInstructorMagicLinkToken,
  hashInstructorMagicLinkToken,
} from "@/features/instructors/lib/magic-link-token";

describe("instructor magic-link tokens", () => {
  it("returns a digest that can be stored without persisting the bearer token", () => {
    const generated = generateInstructorMagicLinkToken();

    assert.equal(generated.token.length, 64);
    assert.equal(generated.tokenDigest.length, 64);
    assert.notEqual(generated.tokenDigest, generated.token);
    assert.equal(
      hashInstructorMagicLinkToken(generated.token),
      generated.tokenDigest,
    );
  });

  it("produces different bearer tokens and digests", () => {
    const first = generateInstructorMagicLinkToken();
    const second = generateInstructorMagicLinkToken();

    assert.notEqual(first.token, second.token);
    assert.notEqual(first.tokenDigest, second.tokenDigest);
  });
});
