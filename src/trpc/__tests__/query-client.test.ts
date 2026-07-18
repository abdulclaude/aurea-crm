import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("query defaults do not change between server and browser environments", () => {
  const source = readFileSync(
    new URL("../query-client.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /typeof\s+window/);
  assert.doesNotMatch(source, /enabled\s*:/);
});
