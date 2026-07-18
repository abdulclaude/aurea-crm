import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const functionSource = source("src/inngest/functions/mindbody-sync.ts");
const routeSource = source("src/app/api/inngest/route.ts");
const routerSource = source(
  "src/features/modules/pilates-studio/server/mindbody-router.ts",
);

describe("Mindbody sync worker", () => {
  it("consumes every Mindbody sync event and is registered", () => {
    for (const eventName of [
      "mindbody/sync.full",
      "mindbody/sync.clients",
      "mindbody/sync.classes",
      "mindbody/sync.client",
    ]) {
      assert.match(functionSource, new RegExp(`event: "${eventName}"`));
    }
    assert.match(routeSource, /import \{ processMindbodySync \}/);
    assert.match(routeSource, /processMindbodySync,/);
  });

  it("uses persisted app scope rather than trusting an event override", () => {
    assert.match(functionSource, /eq\(apps\.id, input\.appId\)/);
    assert.match(
      functionSource,
      /eq\(apps\.organizationId, input\.organizationId\)/,
    );
    assert.match(
      functionSource,
      /input\.locationId[\s\S]*?eq\(apps\.locationId, input\.locationId\)[\s\S]*?isNull\(apps\.locationId\)/,
    );
    assert.match(functionSource, /eq\(apps\.provider, AppProvider\.MINDBODY\)/);
    assert.match(
      functionSource,
      /new NonRetriableError\([\s\S]*persisted event scope/,
    );
    assert.match(
      routerSource,
      /data: \{ appId: app\.id, \.\.\.mindbodyEventScope\(app\) \}/,
    );
  });

  it("bounds retries, runtime, and concurrency while deduplicating event delivery", () => {
    assert.match(functionSource, /retries: 2/);
    assert.match(functionSource, /idempotency: "event\.id"/);
    assert.match(functionSource, /\{ limit: 1, key: "event\.data\.appId" \}/);
    assert.match(functionSource, /\{ limit: 2 \}/);
    assert.match(functionSource, /timeouts: \{ start: "10m", finish: "2h" \}/);
  });

  it("validates payloads and fails partial syncs for bounded retry", () => {
    assert.match(functionSource, /\.strict\(\)/);
    assert.match(functionSource, /mindbodyClientSyncEventSchema/);
    assert.match(functionSource, /safeParse\(data\)/);
    assert.match(functionSource, /requireSuccessfulResult/);
    assert.match(functionSource, /result\.errors\.slice\(0, 3\)/);
  });
});
