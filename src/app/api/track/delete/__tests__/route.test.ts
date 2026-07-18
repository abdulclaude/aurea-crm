import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/track/delete/route";

test("anonymous telemetry credentials cannot authorize destructive deletion", async () => {
  const response = await POST();
  assert.equal(response.status, 410);
  const body = (await response.json()) as { error?: unknown };
  assert.equal(typeof body.error, "string");
});
