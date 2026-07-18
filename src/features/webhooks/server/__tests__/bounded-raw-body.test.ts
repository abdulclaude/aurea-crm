import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_WEBHOOK_PAYLOAD_BYTES,
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "../bounded-raw-body";

test("rejects an oversized declared content length before reading the body", async () => {
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new TextEncoder().encode("{}"));
      controller.close();
    },
  });

  await assert.rejects(
    readBoundedRawBody(
      streamingRequest(body, {
        "content-length": String(MAX_WEBHOOK_PAYLOAD_BYTES + 1),
      }),
    ),
    WebhookPayloadTooLargeError,
  );
});

test("rejects a chunked body as soon as it crosses the byte limit", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_WEBHOOK_PAYLOAD_BYTES));
      controller.enqueue(new Uint8Array(1));
    },
    cancel() {
      cancelled = true;
    },
  });

  await assert.rejects(
    readBoundedRawBody(streamingRequest(body)),
    WebhookPayloadTooLargeError,
  );
  assert.equal(cancelled, true);
});

test("preserves a bounded UTF-8 raw body for signature verification", async () => {
  const rawBody = JSON.stringify({ message: "Aurea \u00a3" });
  const request = new Request("http://localhost/webhook", {
    method: "POST",
    body: rawBody,
  });

  assert.equal(await readBoundedRawBody(request), rawBody);
});

function streamingRequest(
  body: ReadableStream<Uint8Array>,
  headers?: HeadersInit,
): Request {
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers,
    body,
    duplex: "half",
  };
  return new Request("http://localhost/webhook", init);
}
