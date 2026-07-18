import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const fetchSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/provider-accounts/server/oauth-authenticated-fetch.ts",
  ),
  "utf8",
);
const resolverSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/provider-accounts/server/oauth-resolver.ts",
  ),
  "utf8",
);

describe("OAuth authenticated response health", () => {
  it("does not restore health before a provider accepts the token", () => {
    const returnIndex = resolverSource.indexOf("return {\n    providerAccountId");
    assert.ok(returnIndex > 0);
    assert.doesNotMatch(
      resolverSource.slice(0, returnIndex),
      /recordOAuthProviderHealthSuccess/,
    );
  });

  it("classifies authenticated provider responses without persisting bodies", () => {
    assert.match(fetchSource, /classifyOAuthProviderResponseFailure/);
    assert.match(fetchSource, /recordOAuthProviderHealthSuccess/);
    assert.doesNotMatch(fetchSource, /response\.(json|text)\(/);
  });
});
