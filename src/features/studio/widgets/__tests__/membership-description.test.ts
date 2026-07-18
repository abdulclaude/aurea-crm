import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeMembershipDescription } from "@/features/studio/widgets/membership-description";

test("membership descriptions retain basic formatting without executable HTML", () => {
  const result = sanitizeMembershipDescription(
    '<p onclick="alert(1)">Unlimited <strong>classes</strong>.</p><script>alert(1)</script><a href="https://evil.test">link</a>',
  );
  assert.equal(
    result,
    "<p>Unlimited <strong>classes</strong>.</p>link",
  );
  assert.doesNotMatch(result ?? "", /onclick|script|href/);
});
