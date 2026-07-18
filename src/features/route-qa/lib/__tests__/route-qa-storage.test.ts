import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRouteQaCompleted,
  parseRouteQaNotes,
  readRouteQaStorage,
  ROUTE_QA_NOTE_MAX_LENGTH,
  serializeRouteQaNotes,
  writeRouteQaStorage,
} from "@/features/route-qa/lib/route-qa-storage";

test("round-trips valid route notes and preserves completion storage", () => {
  const notes = {
    "stage::section::/dashboard::1": "Chart overlaps at mobile width",
  };

  assert.deepEqual(parseRouteQaNotes(serializeRouteQaNotes(notes)), notes);
  assert.deepEqual(
    parseRouteQaCompleted(JSON.stringify(["route-a", 42, "route-b"])),
    ["route-a", "route-b"],
  );
});

test("fails closed for malformed or incompatible note envelopes", () => {
  assert.deepEqual(parseRouteQaNotes("not-json"), {});
  assert.deepEqual(
    parseRouteQaNotes(JSON.stringify({ version: 2, notes: { route: "note" } })),
    {},
  );
  assert.deepEqual(
    parseRouteQaNotes(
      JSON.stringify({
        version: 1,
        notes: {
          blank: "   ",
          invalid: 42,
          oversized: "x".repeat(ROUTE_QA_NOTE_MAX_LENGTH + 1),
          valid: "Keep this note",
        },
      }),
    ),
    { valid: "Keep this note" },
  );
});

test("storage write failures do not escape to the route checklist", () => {
  const failingStorage = {
    setItem(): void {
      throw new Error("Quota exceeded");
    },
  };

  assert.equal(writeRouteQaStorage(failingStorage, "key", "value"), false);
  assert.equal(
    readRouteQaStorage(
      {
        getItem(): string | null {
          throw new Error("Storage blocked");
        },
      },
      "key",
    ),
    null,
  );
});
