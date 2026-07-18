import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const router = readFileSync(
  path.join(process.cwd(), "src/features/studio/server/promo-codes-router.ts"),
  "utf8",
);

describe("promo redemption history", () => {
  it("requires commerce access and exact payment scope", () => {
    assert.match(router, /listRedemptions:[\s\S]*?capability: "commerce\.view"/);
    assert.match(
      router,
      /listRedemptions:[\s\S]*?eq\(studioPayment\.organizationId, ctx\.orgId\)/,
    );
    assert.match(
      router,
      /ctx\.locationId[\s\S]*?eq\(studioPayment\.locationId, ctx\.locationId\)[\s\S]*?isNull\(studioPayment\.locationId\)/,
    );
    assert.match(router, /isNull\(studioPayment\.deletedAt\)/);
  });

  it("uses persisted payment amounts and numeric SQL for historical prices", () => {
    assert.match(router, /discountAmount: studioPayment\.discountAmount/);
    assert.match(router, /amountAfterDiscount: studioPayment\.amount/);
    assert.match(
      router,
      /\(\$\{studioPayment\.amount\} \+ \$\{studioPayment\.discountAmount\}\)::text/,
    );
    assert.doesNotMatch(
      router.match(/listRedemptions:[\s\S]*?deactivate:/)?.[0] ?? "",
      /Number\(/,
    );
  });

  it("resolves members and pricing options in one projected query", () => {
    assert.match(router, /leftJoin\(client, eq\(client\.id, studioPayment\.clientId\)\)/);
    assert.match(router, /studioPayment\.metadata\} ->> 'pricingOptionId'/);
    assert.match(router, /leftJoin\([\s\S]*?pricingOption/);
    assert.match(router, /orderBy\(desc\(studioPayment\.createdAt\), desc\(studioPayment\.id\)\)/);
  });
});
