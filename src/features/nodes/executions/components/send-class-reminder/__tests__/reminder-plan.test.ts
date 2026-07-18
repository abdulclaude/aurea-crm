import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClassReminderPlans,
  CLASS_REMINDER_EVENT_KEY,
  type ClassReminderRule,
} from "../reminder-plan";

const classStart = new Date("2026-08-20T18:00:00.000Z");
const studioClass = {
  id: "class-1",
  name: "Evening Flow",
  startTime: classStart,
  endTime: new Date("2026-08-20T19:00:00.000Z"),
  instructorName: "Alex",
  location: "Studio One",
};
const recipient = {
  bookingId: "booking-1",
  clientId: "client-1",
  name: "Jordan Lee",
  firstName: "Jordan",
  email: "jordan@example.com",
  phone: "+447700900123",
  mobilePhone: null,
  notificationPrefs: { email: true, sms: true },
};

function rule(input: {
  channel: "EMAIL" | "SMS";
  hoursBefore: number;
}): ClassReminderRule {
  const versionId = `${input.channel.toLowerCase()}-version`;
  return {
    id: `${input.channel.toLowerCase()}-rule`,
    versionId,
    channel: input.channel,
    purpose: "TRANSACTIONAL",
    subject: input.channel === "EMAIL" ? "Reminder: {{class.name}}" : null,
    textBody:
      input.channel === "EMAIL"
        ? "Hi {{client.firstName}}, class starts at {{class.startTime}}."
        : "{{client.firstName}}, {{class.name}} starts soon.",
    htmlBody:
      input.channel === "EMAIL"
        ? "<p>Hi {{client.firstName}}, {{class.name}} is soon.</p>"
        : null,
    scheduledFor: new Date(
      classStart.getTime() - input.hoursBefore * 60 * 60 * 1000,
    ),
    immutableSnapshot: {
      ruleId: `${input.channel.toLowerCase()}-rule`,
      versionId,
      version: 3,
      eventKey: CLASS_REMINDER_EVENT_KEY,
      channel: input.channel,
      purpose: "TRANSACTIONAL",
      scheduleOffsetMinutes: -input.hoursBefore * 60,
    },
  };
}

test("24 hour configuration plans email and SMS with rule bindings", () => {
  const plans = buildClassReminderPlans({
    studioClass,
    recipients: [recipient],
    rules: [
      rule({ channel: "EMAIL", hoursBefore: 24 }),
      rule({ channel: "SMS", hoursBefore: 24 }),
    ],
  });

  assert.equal(plans.length, 2);
  assert.deepEqual(
    plans.map((plan) => plan.channel),
    ["EMAIL", "SMS"],
  );
  assert.equal(plans[0]?.availableAt.toISOString(), "2026-08-19T18:00:00.000Z");
  assert.equal(plans[0]?.subject, "Reminder: Evening Flow");
  assert.match(plans[1]?.textBody ?? "", /Jordan, Evening Flow/);
  assert.equal(
    plans[1]?.communicationRule.snapshot.eventKey,
    CLASS_REMINDER_EVENT_KEY,
  );
});

test("48 hour email-only configuration does not invent an SMS delivery", () => {
  const plans = buildClassReminderPlans({
    studioClass,
    recipients: [recipient],
    rules: [rule({ channel: "EMAIL", hoursBefore: 48 })],
  });

  assert.equal(plans.length, 1);
  assert.equal(plans[0]?.channel, "EMAIL");
  assert.equal(plans[0]?.availableAt.toISOString(), "2026-08-18T18:00:00.000Z");
  assert.equal(plans[0]?.destination, "jordan@example.com");
});

test("channel preferences and missing destinations skip ineligible plans", () => {
  const plans = buildClassReminderPlans({
    studioClass,
    recipients: [
      {
        ...recipient,
        email: null,
        notificationPrefs: { email: true, sms: false },
      },
    ],
    rules: [
      rule({ channel: "EMAIL", hoursBefore: 24 }),
      rule({ channel: "SMS", hoursBefore: 24 }),
    ],
  });
  assert.deepEqual(plans, []);
});
