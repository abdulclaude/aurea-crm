import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { z } from "zod";

import {
  adConversionConfigSchema,
  adConversionProviderSchema,
  adConversionSecretSchema,
} from "@/features/provider-accounts/contracts";
import { chooseDefaultProviderAccount } from "@/features/provider-accounts/lib/scope-policy";
import { sendGoogleLead } from "@/lib/ads/google/enhanced-conversions";
import { sendMetaLead } from "@/lib/ads/meta/conversion-api";
import { sendTikTokLead } from "@/lib/ads/tiktok/events-api";

const requestBodySchema = z.record(z.string(), z.unknown());

test("ad provider contracts support three independently scoped accounts", () => {
  for (const provider of [
    "META_CONVERSIONS",
    "GOOGLE_ADS",
    "TIKTOK_EVENTS",
  ]) {
    assert.equal(adConversionProviderSchema.safeParse(provider).success, true);
  }
  assert.equal(
    adConversionConfigSchema.safeParse({
      provider: "META_CONVERSIONS",
      pixelId: "123",
      inheritToLocations: false,
    }).success,
    true,
  );
  assert.equal(
    adConversionSecretSchema.safeParse({
      provider: "GOOGLE_ADS",
      developerToken: "developer-token",
      accessToken: "access-token",
    }).success,
    true,
  );
});

test("location account wins and non-inheritable organization account is excluded", () => {
  const candidates = [
    {
      id: "organization-account",
      organizationId: "org-a",
      locationId: null,
      inheritToLocations: false,
    },
    {
      id: "location-account",
      organizationId: "org-a",
      locationId: "location-a",
      inheritToLocations: false,
    },
  ];
  assert.equal(
    chooseDefaultProviderAccount(candidates, {
      organizationId: "org-a",
      locationId: "location-a",
    })?.id,
    "location-account",
  );
  assert.equal(
    chooseDefaultProviderAccount(candidates.slice(0, 1), {
      organizationId: "org-a",
      locationId: "location-a",
    }),
    null,
  );
});

test("Meta sends the stable event ID without putting the token in the URL", async (t) => {
  const captured = captureFetch(t, { events_received: 1 });
  const result = await sendMetaLead(
    { pixelId: "pixel-1", accessToken: "secret-token" },
    {
      eventId: "event-1",
      fbclid: "click-1",
      eventTime: 1_700_000_000,
    },
  );
  assert.equal(result.success, true);
  assert.equal(captured.url.includes("secret-token"), false);
  assert.equal(
    new Headers(captured.init?.headers).get("authorization"),
    "Bearer secret-token",
  );
  const body = parseBody(captured.init?.body);
  const data = z.array(requestBodySchema).parse(body.data);
  assert.equal(data[0].event_id, "event-1");
  const userData = requestBodySchema.parse(data[0].user_data);
  assert.equal(userData.fbc, "fb.1.1700000000.click-1");
});

test("Google v24 uses the event ID as the lead order ID", async (t) => {
  const captured = captureFetch(t, { results: [{}] });
  const result = await sendGoogleLead(
    {
      customerId: "1234567890",
      conversionActionId: "42",
      developerToken: "developer-token",
      accessToken: "access-token",
    },
    {
      eventId: "event-2",
      gclid: "google-click",
      conversionDateTime: "2026-07-14 12:00:00+00:00",
    },
  );
  assert.equal(result.success, true);
  assert.equal(captured.url.includes("/v24/"), true);
  const body = parseBody(captured.init?.body);
  const conversions = z.array(requestBodySchema).parse(body.conversions);
  assert.equal(conversions[0].orderId, "event-2");
  assert.equal(typeof body.jobId, "number");
});

test("TikTok receives the stable event ID and timestamp", async (t) => {
  const captured = captureFetch(t, { code: 0, message: "OK" });
  const result = await sendTikTokLead(
    { pixelCode: "pixel-2", accessToken: "access-token" },
    {
      eventId: "event-3",
      ttclid: "tiktok-click",
      timestamp: "2026-07-14T12:00:00.000Z",
    },
  );
  assert.equal(result.success, true);
  const body = parseBody(captured.init?.body);
  const data = z.array(requestBodySchema).parse(body.data);
  assert.equal(data[0].event_id, "event-3");
  assert.equal(data[0].timestamp, "2026-07-14T12:00:00.000Z");
});

test("ad conversion source has no environment credential fallback", () => {
  const forbidden = [
    "META_CAPI_ACCESS_TOKEN",
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_ACCESS_TOKEN",
    "TIKTOK_ACCESS_TOKEN",
  ];
  const sourceRoot = path.join(process.cwd(), "src");
  const sourceFiles = readdirSync(sourceRoot, {
    recursive: true,
    encoding: "utf8",
  }).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
  for (const relativeFile of sourceFiles) {
    if (relativeFile.includes("__tests__")) continue;
    const source = readFileSync(path.join(sourceRoot, relativeFile), "utf8");
    for (const token of forbidden) {
      assert.equal(source.includes(token), false, `${relativeFile} uses ${token}`);
    }
  }
});

test("migration preserves delivery history when provider accounts disconnect", () => {
  const migration = readFileSync(
    path.join(process.cwd(), "drizzle/0032_scoped_ad_conversion_accounts.sql"),
    "utf8",
  );
  assert.match(migration, /AdConversionDelivery_providerAccountId_fkey/);
  assert.match(migration, /AdConversionDelivery_exact_event_scope/);
  assert.match(migration, /AdConversionDelivery_exact_account_scope/);
  assert.match(migration, /account_inherits/);
  assert.match(migration, /event_location_id IS DISTINCT FROM funnel_location_id/);
  assert.match(migration, /ON DELETE restrict ON UPDATE cascade/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
});

function captureFetch(
  t: TestContext,
  responseBody: Record<string, unknown>,
): { url: string; init?: RequestInit } {
  const captured: { url: string; init?: RequestInit } = { url: "" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    captured.url = input instanceof Request ? input.url : input.toString();
    captured.init = init;
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  return captured;
}

function parseBody(body: BodyInit | null | undefined): Record<string, unknown> {
  assert.equal(typeof body, "string");
  return requestBodySchema.parse(JSON.parse(body));
}
