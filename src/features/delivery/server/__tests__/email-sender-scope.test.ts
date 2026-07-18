import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("email sender resolution prioritizes the exact location domain", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/features/delivery/server/email-sender.ts"),
    "utf8",
  );

  assert.match(
    source,
    /CASE WHEN \$\{emailDomain\.locationId\} = \$\{input\.locationId\} THEN 0 ELSE 1 END/,
  );
  assert.match(source, /resolveProviderAccount\(\{/);
});
