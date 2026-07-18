import assert from "node:assert/strict";
import test from "node:test";

import type { CustomerTimelineEvent } from "@/features/customer-timeline/contracts";
import { mergeTimelineEvents } from "@/features/customer-timeline/lib/merge-timeline-events";

function event(id: string, occurredAt: string): CustomerTimelineEvent {
  return {
    id,
    kind: "WORKFLOW",
    title: id,
    description: null,
    status: null,
    occurredAt: new Date(occurredAt),
    secondaryAt: null,
    money: null,
    channel: null,
  };
}

test("merges sources in stable reverse chronological order", () => {
  const page = mergeTimelineEvents({
    sources: [
      [event("workflow:b", "2026-07-12T10:00:00.000Z")],
      [event("payment:a", "2026-07-13T10:00:00.000Z")],
      [event("booking:c", "2026-07-12T10:00:00.000Z")],
    ],
    limit: 2,
  });

  assert.deepEqual(
    page.items.map((item) => item.id),
    ["payment:a", "workflow:b"],
  );
  assert.deepEqual(page.nextCursor, {
    at: new Date("2026-07-12T10:00:00.000Z"),
    id: "workflow:b",
  });
});

test("applies the composite cursor and removes duplicate event ids", () => {
  const cursor = {
    at: new Date("2026-07-12T10:00:00.000Z"),
    id: "workflow:b",
  };
  const duplicate = event("booking:a", "2026-07-11T10:00:00.000Z");
  const page = mergeTimelineEvents({
    sources: [
      [event("workflow:c", "2026-07-12T10:00:00.000Z"), duplicate],
      [duplicate, event("payment:z", "2026-07-10T10:00:00.000Z")],
    ],
    limit: 10,
    cursor,
  });

  assert.deepEqual(
    page.items.map((item) => item.id),
    ["booking:a", "payment:z"],
  );
  assert.equal(page.nextCursor, null);
});
