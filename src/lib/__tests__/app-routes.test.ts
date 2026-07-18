import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { APP_ROUTES } from "@/lib/app-routes";

test("dashboard command routes resolve to real application pages", () => {
  for (const route of Object.values(APP_ROUTES)) {
    const pagePath = join(
      process.cwd(),
      "src/app/(dashboard)/(rest)",
      route,
      "page.tsx",
    );
    assert.equal(existsSync(pagePath), true, `${route} must resolve to a page`);
  }
});
