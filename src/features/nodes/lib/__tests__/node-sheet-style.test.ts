import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const nodesRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("node detail sheet styling", () => {
  it("uses the shared surface and border tokens for every node sheet", () => {
    const sheetFiles = findTsxFiles(nodesRoot).filter((file) => {
      const source = readFileSync(file, "utf8");
      return (
        source.includes("ResizableSheetContent") ||
        source.includes("<SheetContent")
      );
    });

    assert.ok(sheetFiles.length > 0);
    for (const file of sheetFiles) {
      const source = readFileSync(file, "utf8");
      assert.match(
        source,
        /bg-background/,
        `${file} needs the shared sheet surface`,
      );
      assert.match(
        source,
        /border-border/,
        `${file} needs the shared sheet border`,
      );
    }
  });
});

function findTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return findTsxFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}
