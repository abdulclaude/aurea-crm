import assert from "node:assert/strict";
import test from "node:test";

import {
  externalTelemetryBatchSchema,
  externalTelemetryTimesAreCurrent,
  externalWebVitalSchema,
} from "@/features/external-funnels/lib/external-telemetry-contract";

const now = Date.now();

test("external telemetry accepts a bounded SDK event batch", () => {
  const parsed = externalTelemetryBatchSchema.parse({
    events: [
      {
        eventId: "evt_1",
        eventName: "page_view",
        context: { session: { sessionId: "session_1" } },
        timestamp: now,
      },
    ],
  });
  assert.equal(parsed.events.length, 1);
});

test("external telemetry rejects oversized batches and identifiers", () => {
  const event = {
    eventId: "evt_1",
    eventName: "page_view",
    context: { session: { sessionId: "session_1" } },
    timestamp: now,
  };
  assert.equal(
    externalTelemetryBatchSchema.safeParse({ events: Array(11).fill(event) })
      .success,
    false,
  );
  assert.equal(
    externalTelemetryBatchSchema.safeParse({
      events: [{ ...event, eventName: "x".repeat(101) }],
    }).success,
    false,
  );
});

test("external telemetry rejects stale and future event times", () => {
  assert.equal(externalTelemetryTimesAreCurrent([now], now), true);
  assert.equal(
    externalTelemetryTimesAreCurrent([now - 24 * 60 * 60 * 1_000 - 1], now),
    false,
  );
  assert.equal(
    externalTelemetryTimesAreCurrent([now + 5 * 60 * 1_000 + 1], now),
    false,
  );
});

test("web vitals require bounded finite values and ISO timestamps", () => {
  const valid = {
    funnelId: "funnel_1",
    sessionId: "session_1",
    pageUrl: "https://example.test/pricing",
    pagePath: "/pricing",
    metric: "LCP",
    value: 1_200,
    rating: "GOOD",
    timestamp: new Date(now).toISOString(),
  };
  assert.equal(externalWebVitalSchema.safeParse(valid).success, true);
  assert.equal(
    externalWebVitalSchema.safeParse({ ...valid, value: Number.POSITIVE_INFINITY })
      .success,
    false,
  );
});
