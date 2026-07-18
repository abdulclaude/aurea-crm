import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("commerce settings runtime integrity", () => {
  const productCatalog = source(
    "src/features/studio/server/product-catalog-router.ts",
  );
  const migration = source("drizzle/0083_commerce_settings_foundation.sql");
  it("requires commerce capabilities for every product catalog operation", () => {
    assert.equal(
      productCatalog.match(
        /requireCommerceSettingsAccess\(ctx, "commerce\.view"\)/g,
      )?.length,
      3,
    );
    assert.equal(
      productCatalog.match(
        /requireCommerceSettingsAccess\(ctx, "commerce\.manage"\)/g,
      )?.length,
      3,
    );
  });

  it("prevents products from moving away from active tax assignments", () => {
    assert.match(migration, /StudioProduct_tax_assignment_scope_protect/);
    assert.match(migration, /active tax assignment cannot move/);
  });
});
