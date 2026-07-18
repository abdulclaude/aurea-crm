import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classBookedTriggerConfigSchema,
  clientTagTriggerConfigSchema,
  matchesClassBookedTrigger,
  matchesMemberCheckedInTrigger,
  memberClassCountTriggerConfigSchema,
  memberCheckedInTriggerConfigSchema,
  sendSmsConfigSchema,
} from "../studio-node-config";

describe("studio workflow node configuration", () => {
  it("validates milestone and tag trigger contracts", () => {
    assert.deepEqual(
      memberClassCountTriggerConfigSchema.parse({
        variableName: "milestone",
        targetCount: 25,
      }),
      { variableName: "milestone", targetCount: 25 },
    );
    assert.equal(
      memberClassCountTriggerConfigSchema.safeParse({
        variableName: "milestone",
        targetCount: 0,
      }).success,
      false,
    );
    assert.equal(
      clientTagTriggerConfigSchema.safeParse({
        variableName: "tag change",
        tag: "vip",
      }).success,
      false,
    );
    assert.equal(
      clientTagTriggerConfigSchema.safeParse({
        variableName: "tagChange",
        tag: "",
      }).success,
      true,
    );
  });

  it("matches class bookings by stable service while preserving legacy scope", () => {
    const event = {
      classId: "class-1",
      className: "Reformer Basics",
      serviceTypeId: "service-reformer",
      classSeriesId: "series-weekday",
      bookingCount: 1,
    };

    assert.equal(matchesClassBookedTrigger({}, event), true);
    assert.equal(
      matchesClassBookedTrigger({ classId: "class-1" }, event),
      true,
    );
    assert.equal(
      matchesClassBookedTrigger({ className: "reformer basics" }, event),
      true,
    );
    assert.equal(
      matchesClassBookedTrigger({ classId: "class-2" }, event),
      false,
    );
    assert.equal(
      matchesClassBookedTrigger({ classSeriesIds: ["series-weekday"] }, event),
      true,
    );
    assert.equal(
      matchesClassBookedTrigger({ classSeriesIds: ["series-weekend"] }, event),
      false,
    );
    assert.equal(
      matchesClassBookedTrigger(
        { serviceTypeIds: ["service-reformer"] },
        event,
      ),
      true,
    );
    assert.equal(
      matchesClassBookedTrigger({ serviceTypeIds: ["service-yoga"] }, event),
      false,
    );
    assert.equal(
      matchesClassBookedTrigger(
        { firstBookingOnly: true },
        { ...event, bookingCount: 2 },
      ),
      false,
    );
    assert.equal(
      matchesClassBookedTrigger(
        { triggerTiming: "ONE_HOUR_BEFORE" },
        { ...event, triggerTiming: "BOOKED" },
      ),
      false,
    );
    assert.equal(
      matchesClassBookedTrigger(
        { triggerTiming: "ONE_HOUR_BEFORE" },
        { ...event, triggerTiming: "ONE_HOUR_BEFORE" },
      ),
      true,
    );
    assert.equal(
      classBookedTriggerConfigSchema.safeParse({
        variableName: "booking",
        classId: "",
        className: "",
        serviceTypeIds: [],
      }).success,
      true,
    );
  });

  it("supports first-check-in-only without changing the default", () => {
    assert.equal(matchesMemberCheckedInTrigger({}, 8), true);
    assert.equal(
      matchesMemberCheckedInTrigger({ firstCheckInOnly: true }, 1),
      true,
    );
    assert.equal(
      matchesMemberCheckedInTrigger({ firstCheckInOnly: true }, 2),
      false,
    );
    assert.equal(
      memberCheckedInTriggerConfigSchema.safeParse({
        variableName: "checkIn",
        firstCheckInOnly: false,
      }).success,
      true,
    );
  });

  it("requires an SMS recipient and message while allowing two recipient modes", () => {
    assert.equal(
      sendSmsConfigSchema.safeParse({
        clientId: "{{booking.clientId}}",
        message: "You are booked",
      }).success,
      true,
    );
    assert.equal(
      sendSmsConfigSchema.safeParse({
        to: "{{booking.client.phone}}",
        message: "You are booked",
      }).success,
      true,
    );
    assert.equal(
      sendSmsConfigSchema.safeParse({ clientId: "", to: "", message: "Hi" })
        .success,
      false,
    );
    assert.equal(
      sendSmsConfigSchema.safeParse({ clientId: "client-1", message: "" })
        .success,
      false,
    );
  });
});
