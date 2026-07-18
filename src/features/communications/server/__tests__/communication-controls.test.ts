import assert from "node:assert/strict";
import test from "node:test";

import {
  communicationRuleValuesSchema,
  previewCommunicationRuleSchema,
} from "@/features/communications/contracts";
import {
  mailboxEntryMatchesSender,
  normalizeMailboxBlocklistValue,
} from "@/features/communications/lib/mailbox-blocklist";
import { renderCommunicationRuleContent } from "@/features/communications/lib/rule-rendering";

test("accepts materially different transactional email and SMS reminder rules", () => {
  const emailRule = communicationRuleValuesSchema.parse({
    name: "Booking confirmation",
    eventKey: "booking.confirmed",
    channel: "EMAIL",
    purpose: "TRANSACTIONAL",
    isEnabled: true,
    scheduleOffsetMinutes: 0,
    subject: "Confirmed for {{event.name}}",
    textBody: "Hi {{client.name}}, your booking is confirmed.",
    htmlBody: "<p>Hi {{client.name}}, your booking is confirmed.</p>",
    changeNote: "Initial confirmation",
  });
  const smsRule = communicationRuleValuesSchema.parse({
    name: "Class reminder",
    eventKey: "booking.class_reminder",
    channel: "SMS",
    purpose: "SYSTEM",
    isEnabled: false,
    scheduleOffsetMinutes: -1_440,
    subject: null,
    textBody: "Reminder: {{event.name}} starts tomorrow at {{event.time}}.",
    htmlBody: null,
    changeNote: null,
  });

  assert.equal(emailRule.channel, "EMAIL");
  assert.equal(emailRule.scheduleOffsetMinutes, 0);
  assert.equal(smsRule.channel, "SMS");
  assert.equal(smsRule.scheduleOffsetMinutes, -1_440);
  assert.equal(smsRule.isEnabled, false);
});

test("renders preview variables while escaping values placed in HTML", () => {
  const input = previewCommunicationRuleSchema.parse({
    subject: "Hi {{ client.name }}",
    textBody: "Location: {{location.name}}",
    htmlBody: "<strong>{{client.name}}</strong>",
    variables: {
      "client.name": "<Admin>",
      "location.name": "Soho",
    },
  });
  assert.deepEqual(renderCommunicationRuleContent(input), {
    subject: "Hi <Admin>",
    textBody: "Location: Soho",
    htmlBody: "<strong>&lt;Admin&gt;</strong>",
  });
});

test("normalizes and matches exact-address and domain mailbox blocks", () => {
  const address = normalizeMailboxBlocklistValue(
    "ADDRESS",
    " Sender@Example.com ",
  );
  const domain = normalizeMailboxBlocklistValue("DOMAIN", "@Example.com");
  assert.equal(address, "sender@example.com");
  assert.equal(domain, "example.com");
  assert.equal(
    mailboxEntryMatchesSender(
      { matchType: "ADDRESS", valueNormalized: address },
      "sender@example.com",
    ),
    true,
  );
  assert.equal(
    mailboxEntryMatchesSender(
      { matchType: "DOMAIN", valueNormalized: domain },
      "another@example.com",
    ),
    true,
  );
  assert.equal(
    mailboxEntryMatchesSender(
      { matchType: "DOMAIN", valueNormalized: domain },
      "sender@other.example",
    ),
    false,
  );
});
