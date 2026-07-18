import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deliveryPayloadSchema,
  deliverySenderRefSchema,
  enqueueDeliveryInputSchema,
} from "@/features/delivery/lib/payload-schemas";

describe("delivery payload schemas", () => {
  it("accepts an email payload with attachment references", () => {
    const result = deliveryPayloadSchema.safeParse({
      channel: "EMAIL",
      subject: "Class reminder",
      html: "<p>Your class starts soon.</p>",
      attachments: [
        {
          assetId: "asset_123",
          filename: "details.pdf",
          contentType: "application/pdf",
        },
      ],
    });

    assert.equal(result.success, true);
  });

  it("accepts a one-click unsubscribe URL for marketing delivery", () => {
    assert.equal(
      deliveryPayloadSchema.safeParse({
        channel: "EMAIL",
        subject: "Studio update",
        text: "News",
        unsubscribeUrl: "https://crm.example/api/unsubscribe?token=opaque",
      }).success,
      true,
    );
  });

  it("accepts a scoped invoice PDF reference without inline bytes", () => {
    const result = deliveryPayloadSchema.safeParse({
      channel: "EMAIL",
      subject: "Invoice INV-1042",
      text: "Your invoice is attached.",
      attachments: [
        {
          kind: "INVOICE_PDF",
          invoiceId: "invoice_1042",
          filename: "invoice-INV-1042.pdf",
          contentType: "application/pdf",
        },
      ],
    });

    assert.equal(result.success, true);
  });

  it("rejects attachment filenames that contain filesystem paths", () => {
    const result = deliveryPayloadSchema.safeParse({
      channel: "EMAIL",
      subject: "Invoice INV-1042",
      text: "Your invoice is attached.",
      attachments: [
        {
          kind: "INVOICE_PDF",
          invoiceId: "invoice_1042",
          filename: "../invoice.pdf",
          contentType: "application/pdf",
        },
      ],
    });

    assert.equal(result.success, false);
  });

  it("rejects email payloads without content", () => {
    assert.equal(
      deliveryPayloadSchema.safeParse({
        channel: "EMAIL",
        subject: "Missing body",
      }).success,
      false,
    );
  });

  it("accepts encrypted content without durable plaintext HTML", () => {
    const result = deliveryPayloadSchema.safeParse({
      channel: "EMAIL",
      subject: "Set up your instructor account",
      protectedContent: {
        scheme: "AUREA_ENCRYPTED_V1",
        html: "ciphertext",
      },
    });

    assert.equal(result.success, true);
  });

  it("rejects inline attachment bytes", () => {
    assert.equal(
      deliveryPayloadSchema.safeParse({
        channel: "EMAIL",
        subject: "Class reminder",
        text: "Your class starts soon.",
        attachments: [
          {
            assetId: "asset_123",
            filename: "details.pdf",
            contentType: "application/pdf",
            content: "base64-payload",
          },
        ],
      }).success,
      false,
    );
  });

  it("accepts safe app action URLs and rejects unsupported protocols", () => {
    assert.equal(
      deliveryPayloadSchema.safeParse({
        channel: "APP",
        body: "Your receipt is ready",
        actionUrl: "/receipts/receipt_123",
      }).success,
      true,
    );
    assert.equal(
      deliveryPayloadSchema.safeParse({
        channel: "APP",
        body: "Your receipt is ready",
        actionUrl: "javascript:alert(1)",
      }).success,
      false,
    );
  });
});

describe("delivery request contracts", () => {
  it("accepts provider references without embedding credentials", () => {
    assert.equal(
      deliverySenderRefSchema.safeParse({
        kind: "SMS_CONFIG",
        id: "sms_config_123",
      }).success,
      true,
    );
  });

  it("requires the envelope and payload channels to agree", () => {
    const result = enqueueDeliveryInputSchema.safeParse({
      organizationId: "org_123",
      locationId: null,
      clientId: null,
      channel: "SMS",
      purpose: "TRANSACTIONAL",
      provider: "TWILIO",
      providerAccountId: "provider_account_123",
      providerAccountRef: "sms_config_123",
      sourceType: "BOOKING",
      sourceId: "booking_123",
      destination: "+447700900123",
      sender: { kind: "SMS_CONFIG", id: "sms_config_123" },
      payload: {
        channel: "EMAIL",
        subject: "Wrong channel",
        text: "This must fail",
      },
      idempotencyKey: "booking_123:reminder:24h",
    });

    assert.equal(result.success, false);
  });

  it("requires the provider and sender reference to agree", () => {
    const result = enqueueDeliveryInputSchema.safeParse({
      organizationId: "org_123",
      locationId: null,
      clientId: null,
      channel: "EMAIL",
      purpose: "ONE_TO_ONE",
      provider: "GMAIL",
      providerAccountId: null,
      providerAccountRef: "mailbox_123",
      sourceType: "INBOX_MESSAGE",
      sourceId: "message_123",
      destination: "member@example.com",
      sender: {
        kind: "MAILBOX",
        provider: "OUTLOOK",
        userId: "user_123",
      },
      payload: {
        channel: "EMAIL",
        subject: "Hello",
        text: "Welcome",
      },
      idempotencyKey: "message_123:send",
    });

    assert.equal(result.success, false);
  });

  it("requires an internal account binding for Resend and SMS providers", () => {
    const result = enqueueDeliveryInputSchema.safeParse({
      organizationId: "org_123",
      locationId: "location_123",
      clientId: null,
      channel: "SMS",
      purpose: "ONE_TO_ONE",
      provider: "TWILIO",
      providerAccountRef: "sms_config_123",
      sourceType: "INBOX_MESSAGE",
      sourceId: "message_123",
      destination: "+447700900123",
      sender: { kind: "SMS_CONFIG", id: "sms_config_123" },
      payload: { channel: "SMS", body: "Hello" },
      idempotencyKey: "message_123:send",
    });

    assert.equal(result.success, false);
  });

  it("accepts an immutable communication-rule version binding", () => {
    const result = enqueueDeliveryInputSchema.safeParse({
      organizationId: "org_123",
      locationId: "location_123",
      clientId: "client_123",
      channel: "SMS",
      purpose: "SYSTEM",
      provider: "TWILIO",
      providerAccountId: "provider_account_123",
      providerAccountRef: "sms_config_123",
      sourceType: "BOOKING_REMINDER",
      sourceId: "booking_123",
      destination: "+447700900123",
      sender: { kind: "SMS_CONFIG", id: "sms_config_123" },
      communicationRule: {
        ruleId: "rule_123",
        versionId: "rule_version_2",
        snapshot: {
          ruleId: "rule_123",
          versionId: "rule_version_2",
          version: 2,
          eventKey: "booking.class_reminder",
          channel: "SMS",
          purpose: "SYSTEM",
          scheduleOffsetMinutes: -1_440,
        },
      },
      payload: { channel: "SMS", body: "Class starts tomorrow" },
      idempotencyKey: "booking_123:rule_version_2",
    });

    assert.equal(result.success, true);
  });

  it("rejects a rule snapshot that does not match the delivery channel", () => {
    const result = enqueueDeliveryInputSchema.safeParse({
      organizationId: "org_123",
      locationId: null,
      clientId: null,
      channel: "SMS",
      purpose: "SYSTEM",
      provider: "TWILIO",
      providerAccountId: "provider_account_123",
      providerAccountRef: "sms_config_123",
      sourceType: "REMINDER",
      sourceId: "reminder_123",
      destination: "+447700900123",
      sender: { kind: "SMS_CONFIG", id: "sms_config_123" },
      communicationRule: {
        ruleId: "rule_123",
        versionId: "version_1",
        snapshot: {
          ruleId: "rule_123",
          versionId: "version_1",
          version: 1,
          eventKey: "booking.confirmed",
          channel: "EMAIL",
          purpose: "SYSTEM",
          scheduleOffsetMinutes: 0,
        },
      },
      payload: { channel: "SMS", body: "Hello" },
      idempotencyKey: "reminder_123:send",
    });

    assert.equal(result.success, false);
  });
});
