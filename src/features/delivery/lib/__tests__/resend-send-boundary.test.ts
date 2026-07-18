import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

test("product email sends only through the scoped Resend adapter", () => {
  const sourceRoot = path.join(process.cwd(), "src");
  const sourceFiles = readdirSync(sourceRoot, {
    recursive: true,
    encoding: "utf8",
  }).filter(
    (file) =>
      !file.includes("__tests__") &&
      (file.endsWith(".ts") || file.endsWith(".tsx")),
  );
  const allowedFile = path.normalize(
    "features/delivery/server/providers/resend-provider.ts",
  );

  for (const relativeFile of sourceFiles) {
    const contents = readFileSync(path.join(sourceRoot, relativeFile), "utf8");
    if (!contents.includes(".emails.send(")) {
      continue;
    }

    assert.equal(
      path.normalize(relativeFile),
      allowedFile,
      `${relativeFile} bypasses the scoped Resend delivery adapter`,
    );
  }
});
