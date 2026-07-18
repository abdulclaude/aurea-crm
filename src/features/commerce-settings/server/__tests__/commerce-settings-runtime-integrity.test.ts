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
  const invoicesRouter = source(
    "src/features/invoicing/server/invoices-router.ts",
  );
  const pricingRouter = source(
    "src/features/studio/server/pricing-options-router.ts",
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

  it("makes canonical commerce definitions authoritative for new writes", () => {
    assert.match(invoicesRouter, /resolveTaxForInvoiceLines/);
    assert.match(invoicesRouter, /commerceSnapshotVersion: 1/);
    assert.match(invoicesRouter, /manualTaxOverrideSchema/);
    assert.match(pricingRouter, /listCanonicalRevenueCategories/);
    assert.match(pricingRouter, /resolveRevenueCategorySelection/);
    assert.match(productCatalog, /rejectLegacyProductTaxRate/);
  });
});
