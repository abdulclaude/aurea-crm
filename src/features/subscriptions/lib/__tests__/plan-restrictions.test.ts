import assert from "node:assert/strict";
import test from "node:test";

import { arePlanRestrictionsDisabled } from "../plan-restrictions";

test("disables plan restrictions in development and automated tests", () => {
  assert.equal(arePlanRestrictionsDisabled({ NODE_ENV: "development" }), true);
  assert.equal(arePlanRestrictionsDisabled({ NODE_ENV: "test" }), true);
});

test("never disables plan restrictions in production", () => {
  assert.equal(
    arePlanRestrictionsDisabled({
      NODE_ENV: "production",
    }),
    false,
  );
  assert.equal(
    arePlanRestrictionsDisabled({ NODE_ENV: undefined }),
    false,
  );
});
