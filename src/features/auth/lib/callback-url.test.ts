import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSafeCallbackUrl } from "@/features/auth/lib/callback-url";

describe("getSafeCallbackUrl", () => {
  it("keeps local paths and their query strings", () => {
    assert.equal(
      getSafeCallbackUrl("/settings/integrations?tab=accounts"),
      "/settings/integrations?tab=accounts",
    );
  });

  it("rejects absolute, protocol-relative, and script URLs", () => {
    assert.equal(getSafeCallbackUrl("https://example.com"), "/");
    assert.equal(getSafeCallbackUrl("//example.com"), "/");
    assert.equal(getSafeCallbackUrl("javascript:alert(1)"), "/");
    assert.equal(getSafeCallbackUrl("/\\example.com"), "/");
  });
});
