import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const calComAttendeeSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    timeZone: z.string().optional(),
  })
  .passthrough();

const calComBookingPayloadSchema = z
  .object({
    uid: z.string().min(1).optional(),
    bookingUid: z.string().min(1).optional(),
    id: z.number().int().optional(),
    bookingId: z.number().int().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    attendees: z.array(calComAttendeeSchema).optional(),
    eventType: z.object({ id: z.number().int().optional() }).passthrough().optional(),
    eventTypeId: z.number().int().optional(),
    metadata: z
      .object({
        clientId: z.string().min(1).optional(),
        dealId: z.string().min(1).optional(),
      })
      .passthrough()
      .optional(),
    rescheduledFromUid: z.string().min(1).optional(),
    rescheduleUid: z.string().min(1).optional(),
    cancellationReason: z.string().optional(),
  })
  .passthrough();

export const calComWebhookEventSchema = z
  .object({
    triggerEvent: z.enum([
      "BOOKING_CREATED",
      "BOOKING_RESCHEDULED",
      "BOOKING_CANCELLED",
    ]),
    createdAt: z.string().datetime({ offset: true }).optional(),
    payload: calComBookingPayloadSchema,
  })
  .passthrough();

export type CalComWebhookEvent = z.infer<typeof calComWebhookEventSchema>;
export type CalComBookingPayload = CalComWebhookEvent["payload"];

export function calComWebhookEventKey(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function verifyCalComWebhookSignature(input: {
  rawBody: string;
  secret: string;
  signature: string | null;
}): boolean {
  if (!input.signature || !/^[a-f\d]{64}$/i.test(input.signature)) {
    return false;
  }

  const expected = createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest();
  const provided = Buffer.from(input.signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
