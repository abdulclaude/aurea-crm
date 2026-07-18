import { z } from "zod";

import { STORED_COMMUNICATION_CHANNELS } from "@/features/delivery/contracts";

export const CUSTOMER_TIMELINE_KINDS = [
  "BOOKING",
  "ATTENDANCE",
  "PAYMENT",
  "CREDIT",
  "MESSAGE",
  "WORKFLOW",
] as const;

export const customerTimelineKindSchema = z.enum(CUSTOMER_TIMELINE_KINDS);

export const customerTimelineCursorSchema = z.object({
  at: z.coerce.date(),
  id: z.string().min(1).max(256),
});

export const customerTimelineMoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.string().length(3),
  exponent: z.number().int().min(0).max(6),
});

export const customerTimelineEventSchema = z.object({
  id: z.string(),
  kind: customerTimelineKindSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: z.string().nullable(),
  occurredAt: z.date(),
  secondaryAt: z.date().nullable(),
  money: customerTimelineMoneySchema.nullable(),
  channel: z.enum(STORED_COMMUNICATION_CHANNELS).nullable(),
});

export const customerTimelineInputSchema = z.object({
  clientId: z.string().min(1).max(128),
  limit: z.number().int().min(1).max(50).default(30),
  cursor: customerTimelineCursorSchema.optional(),
});

export const customerTimelinePageSchema = z.object({
  items: z.array(customerTimelineEventSchema),
  nextCursor: customerTimelineCursorSchema.nullable(),
});

export type CustomerTimelineCursor = z.infer<
  typeof customerTimelineCursorSchema
>;
export type CustomerTimelineEvent = z.infer<typeof customerTimelineEventSchema>;
export type CustomerTimelinePage = z.infer<typeof customerTimelinePageSchema>;
