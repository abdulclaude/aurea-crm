import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const router = source(
  "src/features/invoicing/server/bank-transfer-settings-router.ts",
);
const card = source(
  "src/features/invoicing/components/bank-transfer-card.tsx",
);
const organizationsRouter = source(
  "src/features/organizations/server/routers.ts",
);

describe("bank transfer settings integrity", () => {
  it("derives an exact tenant scope from the authenticated context", () => {
    assert.doesNotMatch(router, /organizationId:\s*z\.string/);
    assert.doesNotMatch(router, /locationId:\s*z\.string/);
    assert.match(router, /locationId === null/);
    assert.match(router, /isNull\(bankTransferSettings\.locationId\)/);
    assert.match(router, /eq\(bankTransferSettings\.locationId, locationId\)/);
    assert.doesNotMatch(router, /input\.organizationId|input\.locationId/);
  });

  it("requires financial capabilities and never logs bank details", () => {
    assert.match(router, /requireBankTransferAccess\(ctx, "commerce\.view"\)/);
    assert.equal(
      router.match(
        /requireBankTransferAccess\(ctx, "commerce\.manage"\)/g,
      )?.length,
      2,
    );
    assert.doesNotMatch(router, /console\.(log|error|info|debug)/);
  });

  it("returns null when the tenant has not configured bank transfers", () => {
    assert.match(router, /return settings \?\? null/);
  });

  it("uses the typed query API and exposes loading and retry states", () => {
    assert.match(card, /bankTransferSettings\.get\.queryOptions\(\{\}\)/);
    assert.doesNotMatch(card, /as any/);
    assert.match(card, /settingsQuery\.isLoading/);
    assert.match(card, /settingsQuery\.isError/);
    assert.match(card, /settingsQuery\.refetch\(\)/);
    assert.doesNotMatch(card, /settings\.accountNumber}</);
  });

  it("persists location-level dunning settings", () => {
    assert.match(
      organizationsRouter,
      /updates\.dunningEnabled !== undefined[\s\S]*?dunningEnabled:\s*updates\.dunningEnabled/,
    );
    assert.match(
      organizationsRouter,
      /updates\.dunningDays !== undefined[\s\S]*?dunningDays:\s*updates\.dunningDays/,
    );
  });
});
