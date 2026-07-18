import { createHash } from "crypto";
import { z } from "zod";
import type Stripe from "stripe";

const stripeEventEnvelopeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  account: z.string().min(1).optional(),
  api_version: z.string().nullable().optional(),
  created: z.number().int().nonnegative(),
  livemode: z.boolean(),
  data: z.object({ object: z.unknown() }),
});

export type StripeEventEnvelope = {
  id: string;
  type: string;
  accountId: string | null;
  apiVersion: string | null;
  created: number;
  livemode: boolean;
  dataObject: unknown;
};

export const MAX_STRIPE_WEBHOOK_BYTES = 1_048_576;

export class PermanentStripeEventError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PermanentStripeEventError";
    this.code = code;
  }
}

export function toStripeEventEnvelope(event: Stripe.Event): StripeEventEnvelope {
  return {
    id: event.id,
    type: event.type,
    accountId: event.account ?? null,
    apiVersion: event.api_version ?? null,
    created: event.created,
    livemode: event.livemode,
    dataObject: event.data.object,
  };
}

export function parseStoredStripeEvent(raw: string): StripeEventEnvelope {
  const parsedJson: unknown = JSON.parse(raw);
  const event = stripeEventEnvelopeSchema.parse(parsedJson);

  return {
    id: event.id,
    type: event.type,
    accountId: event.account ?? null,
    apiVersion: event.api_version ?? null,
    created: event.created,
    livemode: event.livemode,
    dataObject: event.data.object,
  };
}

export function getStripeObjectIdentity(value: unknown): {
  objectId: string | null;
  objectType: string | null;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { objectId: null, objectType: null };
  }

  const record = value as Record<string, unknown>;
  return {
    objectId: typeof record.id === "string" ? record.id : null,
    objectType: typeof record.object === "string" ? record.object : null,
  };
}

export function stripePayloadHash(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function assertStripeBodySize(rawBody: string): void {
  if (Buffer.byteLength(rawBody, "utf8") > MAX_STRIPE_WEBHOOK_BYTES) {
    throw new PermanentStripeEventError(
      "PAYLOAD_TOO_LARGE",
      "Stripe webhook payload exceeds the accepted size",
    );
  }
}

export function redactedErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown processing error";
  return message.replace(/\s+/g, " ").slice(0, 500);
}
