import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "src/features/onedrive/server/subscriptions.ts"),
  "utf8",
);

describe("OneDrive delta processing", () => {
  it("persists and advances a Graph delta cursor after processing every item", () => {
    assert.match(source, /delta\?token=latest/);
    assert.match(source, /@odata\.nextLink/);
    assert.match(source, /@odata\.deltaLink/);
    assert.match(source, /for \(const change of delta\.items\)/);
    assert.match(source, /lastDeltaLink: delta\.deltaLink/);
    assert.doesNotMatch(source, /\$top=1/);
  });

  it("validates provider-supplied cursor URLs before fetching them", () => {
    assert.match(source, /url\.origin !== "https:\/\/graph\.microsoft\.com"/);
    assert.match(source, /url\.pathname\.startsWith\("\/v1\.0\/"\)/);
  });
});
