import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveOutlookTriggerSender } from "../trigger-config";

describe("resolveOutlookTriggerSender", () => {
  it("prefers and trims the canonical sender field", () => {
    assert.equal(
      resolveOutlookTriggerSender({
        sender: "  sender@example.com  ",
        from: "legacy@example.com",
      }),
      "sender@example.com",
    );
  });

  it("accepts legacy from values without preserving the old key", () => {
    assert.equal(
      resolveOutlookTriggerSender({ from: "  legacy@example.com  " }),
      "legacy@example.com",
    );
    assert.equal(resolveOutlookTriggerSender({ from: "   " }), undefined);
  });
});
