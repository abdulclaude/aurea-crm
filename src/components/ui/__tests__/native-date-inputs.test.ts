import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [path] : [];
  });
}

test("runtime source does not render native date or datetime-local inputs", () => {
  const violations = sourceFiles(join(process.cwd(), "src")).filter((path) => {
    if (path.includes(`${join("__tests__", "native-date-inputs.test.ts")}`)) {
      return false;
    }
    const source = readFileSync(path, "utf8");
    return /type\s*=\s*["'](?:date|datetime-local|month|week)["']/.test(source);
  });

  assert.deepEqual(violations, []);
});
