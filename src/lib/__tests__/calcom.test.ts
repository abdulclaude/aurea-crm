import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import {
  CalComApiError,
  CalComClient,
  type CalComWebhookTrigger,
} from "../calcom";

type CapturedRequest = {
  url: string;
  init: RequestInit;
};

function captureFetch(
  t: TestContext,
  responder: (request: CapturedRequest) => Response,
): CapturedRequest[] {
  const originalFetch = globalThis.fetch;
  const requests: CapturedRequest[] = [];
  globalThis.fetch = async (input, init = {}) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const request = { url, init };
    requests.push(request);
    return responder(request);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  return requests;
}

function objectValue(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value));
  return value;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const eventTypeResponse = {
  status: "success",
  data: {
    id: 7,
    title: "Consultation",
    slug: "consultation",
    lengthInMinutes: 45,
    hidden: false,
    metadata: {},
  },
};

const bookingResponse = {
  status: "success",
  data: {
    id: 42,
    uid: "booking-uid",
    title: "Consultation",
    status: "accepted",
    start: "2026-07-20T10:00:00Z",
    end: "2026-07-20T10:45:00Z",
    duration: 45,
    eventTypeId: 7,
    attendees: [
      {
        name: "Ada",
        email: "ada@example.com",
        timeZone: "Europe/London",
      },
    ],
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-01T10:00:00Z",
  },
};

test("uses Cal.com v2 bearer auth and the event-type endpoint version", async (t) => {
  const requests = captureFetch(t, () => jsonResponse(eventTypeResponse, 201));
  const client = new CalComClient({
    apiKey: "cal_test_secret",
    baseUrl: "https://cal.example.test/v2",
  });

  const result = await client.createEventType({
    title: "Consultation",
    slug: "consultation",
    length: 45,
  });

  assert.equal(result.data.length, 45);
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.url, "https://cal.example.test/v2/event-types");
  assert.equal(new Headers(requests[0]?.init.headers).get("Authorization"), "Bearer cal_test_secret");
  assert.equal(new Headers(requests[0]?.init.headers).get("cal-api-version"), "2024-06-14");
  assert.equal(requests[0]?.url.includes("apiKey"), false);

  const body: unknown = JSON.parse(String(requests[0]?.init.body));
  assert.deepEqual(body, {
    title: "Consultation",
    slug: "consultation",
    lengthInMinutes: 45,
  });
});

test("translates Aurea's legacy booking fields to the current v2 attendee body", async (t) => {
  const requests = captureFetch(t, () => jsonResponse(bookingResponse, 201));
  const client = new CalComClient({ apiKey: "cal_booking_key" });

  await client.createBooking({
    start: "2026-07-20T10:00:00Z",
    eventTypeId: 7,
    timeZone: "Europe/London",
    responses: {
      name: "Ada",
      email: "ada@example.com",
      phone: "+44123456789",
      company: "Analytical Engines Ltd",
    },
    lengthInMinutes: 45,
  });

  const request = requests[0];
  assert.equal(request?.url, "https://api.cal.com/v2/bookings");
  assert.equal(new Headers(request?.init.headers).get("cal-api-version"), "2026-02-25");
  const parsedBody: unknown = JSON.parse(String(request?.init.body));
  const body = objectValue(parsedBody);
  assert.deepEqual(body.attendee, {
    name: "Ada",
    email: "ada@example.com",
    timeZone: "Europe/London",
    language: "en",
    phoneNumber: "+44123456789",
  });
  assert.deepEqual(body.bookingFieldsResponses, {
    company: "Analytical Engines Ltd",
  });
});

test("uses cursor pagination and the current booking-list version", async (t) => {
  const requests = captureFetch(t, () =>
    jsonResponse({
      status: "success",
      data: [bookingResponse.data],
      pagination: { nextCursor: "next-page", hasMore: true },
    }),
  );
  const client = new CalComClient({ apiKey: "cal_list_key" });

  const result = await client.getBookings({
    eventTypeId: 7,
    afterStart: "2026-07-01T00:00:00Z",
    take: 25,
  });

  assert.equal(result.pagination.nextCursor, "next-page");
  assert.equal(new Headers(requests[0]?.init.headers).get("cal-api-version"), "2026-05-01");
  const url = new URL(requests[0]?.url ?? "");
  assert.equal(url.searchParams.get("eventTypeId"), "7");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.has("take"), false);
});

test("creates, updates, and deletes user-level webhooks with normalized results", async (t) => {
  let id = 100;
  const requests = captureFetch(t, () =>
    jsonResponse({ status: "success", data: { id: id++, active: true } }),
  );
  const client = new CalComClient({ apiKey: "cal_webhook_key" });
  const triggers: CalComWebhookTrigger[] = [
    "BOOKING_CREATED",
    "BOOKING_RESCHEDULED",
    "BOOKING_CANCELLED",
  ];

  assert.deepEqual(
    await client.createWebhook({
      subscriberUrl: "https://crm.example.com/api/webhooks/calcom/credential-id",
      triggers,
      secret: "a-long-signing-secret",
    }),
    { id: "100", active: true },
  );
  assert.deepEqual(
    await client.updateWebhook("100", {
      subscriberUrl: "https://crm.example.com/api/webhooks/calcom/credential-id",
      triggers,
      secret: "a-rotated-signing-secret",
      active: true,
    }),
    { id: "101", active: true },
  );
  assert.deepEqual(await client.deleteWebhook("100"), {
    id: "102",
    active: true,
  });

  assert.deepEqual(
    requests.map((request) => [request.init.method, request.url]),
    [
      ["POST", "https://api.cal.com/v2/webhooks"],
      ["PATCH", "https://api.cal.com/v2/webhooks/100"],
      ["DELETE", "https://api.cal.com/v2/webhooks/100"],
    ],
  );
  const parsedCreateBody: unknown = JSON.parse(String(requests[0]?.init.body));
  const createBody = objectValue(parsedCreateBody);
  assert.equal(createBody.version, "2021-10-20");
  assert.equal(createBody.active, true);
});

test("redacts provider credentials and does not expose unbounded error bodies", async (t) => {
  const apiKey = "cal_highly_sensitive_key";
  let requestCount = 0;
  captureFetch(t, () => {
    requestCount += 1;
    if (requestCount === 1) {
      return jsonResponse(
        {
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: `Bearer ${apiKey} was rejected`,
          },
        },
        401,
      );
    }
    return new Response("x".repeat(10_000), { status: 503 });
  });
  const client = new CalComClient({ apiKey });

  await assert.rejects(
    () => client.getMe(),
    (error: unknown) => {
      assert.ok(error instanceof CalComApiError);
      assert.equal(error.statusCode, 401);
      assert.equal(error.providerCode, "UNAUTHORIZED");
      assert.equal(error.message.includes(apiKey), false);
      assert.equal(error.message.includes("[REDACTED]"), true);
      assert.ok(error.message.length < 700);
      return true;
    },
  );

  await assert.rejects(
    () => client.getMe(),
    (error: unknown) => {
      assert.ok(error instanceof CalComApiError);
      assert.equal(error.statusCode, 503);
      assert.equal(error.message, "Cal.com API error (503): Cal.com rejected the request");
      assert.ok(error.message.length < 700);
      return true;
    },
  );
});

test("fails closed when a successful provider response has an unexpected shape", async (t) => {
  captureFetch(t, () => jsonResponse({ status: "success", data: { id: "wrong" } }));
  const client = new CalComClient({ apiKey: "cal_shape_key" });

  await assert.rejects(
    () => client.getEventTypes(),
    (error: unknown) => {
      assert.ok(error instanceof CalComApiError);
      assert.equal(error.statusCode, 502);
      assert.equal(error.message, "Cal.com returned an unexpected response shape");
      return true;
    },
  );
});
