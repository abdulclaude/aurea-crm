import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sourceRoot = path.join(
  process.cwd(),
  "src/features/nodes/executions/components/find-clients",
);
const executorSource = readFileSync(
  path.join(sourceRoot, "executor.ts"),
  "utf8",
);
const dialogSource = readFileSync(path.join(sourceRoot, "dialog.tsx"), "utf8");

test("find clients supports an exact templated client ID within workflow scope", () => {
  assert.match(dialogSource, /clientId: z\.string\(\)\.optional\(\)/);
  assert.match(executorSource, /Handlebars\.compile\(data\.clientId\)\(context\)/);
  assert.match(executorSource, /eq\(client\.id, clientId\)/);
  assert.match(
    executorSource,
    /eq\(client\.organizationId, workflow\.organizationId\)/,
  );
  assert.match(executorSource, /eq\(client\.locationId, workflow\.locationId\)/);
});
