import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isInboxReadCursorAdvance } from "../read-cursor-policy";

describe("inbox read cursor policy", () => {
  const current = new Date("2026-07-14T12:00:00.000Z");

  it("advances an empty or older cursor", () => {
    assert.equal(isInboxReadCursorAdvance(null, current), true);
    assert.equal(
      isInboxReadCursorAdvance(
        new Date("2026-07-14T11:59:59.000Z"),
        current,
      ),
      true,
    );
  });

  it("does not regress or rewrite an equal cursor", () => {
    assert.equal(isInboxReadCursorAdvance(current, current), false);
    assert.equal(
      isInboxReadCursorAdvance(
        current,
        new Date("2026-07-14T11:59:59.000Z"),
      ),
      false,
    );
  });
});
