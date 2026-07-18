import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const NODES_ROOT = join(process.cwd(), "src/features/nodes");

test("node detail surfaces use the shared semantic sheet styling", () => {
  const dialogFiles = collectDialogFiles(NODES_ROOT);
  assert.ok(dialogFiles.length > 100, "expected the full node dialog catalog");

  const forbidden = [
    "bg-[#202e32]",
    "bg-[#202E32]",
    "bg-[#1A2326]",
    "bg-[#131B1C]",
    "border-white/5",
    "border-white/10",
    "border-black/10",
    "text-white",
    "text-foreground",
    "DialogContent",
    "<SheetContent",
  ];
  const violations = dialogFiles.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return forbidden
      .filter((token) => source.includes(token))
      .map((token) => `${file.replace(`${process.cwd()}/`, "")}: ${token}`);
  });

  assert.deepEqual(violations, []);
});

function collectDialogFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectDialogFiles(path);
    return entry.name === "dialog.tsx" || entry.name.endsWith("-dialog.tsx")
      ? [path]
      : [];
  });
}
