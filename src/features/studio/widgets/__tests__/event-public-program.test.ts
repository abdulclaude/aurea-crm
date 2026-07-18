import assert from "node:assert/strict";
import test from "node:test";

import { eventWidgetConfigSchema } from "@/features/studio/widgets/contracts";
import { toPublicEventProgram } from "@/features/studio/widgets/event-public-program";

const program = {
  id: "event-1",
  name: "Mobility workshop",
  description: "A focused workshop.",
  imageUrl: "javascript:alert(1)",
  format: "IN_PERSON" as const,
  defaultLocation: "Main studio",
  durationMinutes: 120,
  price: "45.00",
  currency: "gbp",
  updatedAt: new Date("2026-07-14T10:00:00.000Z"),
  occurrences: [
    {
      id: "class-1",
      name: "Mobility workshop",
      startTime: new Date("2026-08-14T10:00:00.000Z"),
      endTime: new Date("2026-08-14T12:00:00.000Z"),
      instructorName: "Alex Morgan",
      location: "Main studio",
      roomName: "Room one",
      isVirtual: false,
      updatedAt: new Date("2026-07-14T10:00:00.000Z"),
    },
    {
      id: "class-2",
      name: "Mobility workshop",
      startTime: new Date("2026-08-21T10:00:00.000Z"),
      endTime: new Date("2026-08-21T12:00:00.000Z"),
      instructorName: null,
      location: "Main studio",
      roomName: null,
      isVirtual: false,
      updatedAt: new Date("2026-07-14T10:00:00.000Z"),
    },
  ],
};

test("projects only bounded event discovery data", () => {
  const projected = toPublicEventProgram(
    program,
    eventWidgetConfigSchema.parse({
      serviceTypeIds: ["event-1"],
      occurrencesPerEvent: 1,
    }),
  );
  assert.equal(projected.imageUrl, null);
  assert.equal(projected.currency, "GBP");
  assert.equal(projected.occurrences.length, 1);
  assert.equal(projected.occurrences[0]?.startTime, "2026-08-14T10:00:00.000Z");
  assert.equal("bookingUrl" in projected, false);
});

test("honors a materially different privacy-minimized display config", () => {
  const projected = toPublicEventProgram(
    { ...program, imageUrl: "https://cdn.example.test/event.jpg" },
    eventWidgetConfigSchema.parse({
      serviceTypeIds: ["event-1"],
      showDescription: false,
      showImage: false,
      showPrice: false,
      showLocation: false,
    }),
  );
  assert.equal(projected.description, null);
  assert.equal(projected.imageUrl, null);
  assert.equal(projected.price, null);
  assert.equal(projected.defaultLocation, null);
  assert.equal(projected.occurrences[0]?.location, null);
  assert.equal(projected.occurrences[0]?.roomName, null);
});
