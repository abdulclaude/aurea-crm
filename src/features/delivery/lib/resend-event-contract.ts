import { z } from "zod";

import type { ProviderEventKind } from "@/features/delivery/contracts";

export const RESEND_EVENT_TYPES = [
  "email.bounced",
  "email.clicked",
  "email.complained",
  "email.delivered",
  "email.delivery_delayed",
  "email.failed",
  "email.opened",
  "email.received",
  "email.scheduled",
  "email.sent",
  "email.suppressed",
] as const;

const resendTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const resendWebhookEventSchema = z
  .object({
    type: z.enum(RESEND_EVENT_TYPES),
    created_at: resendTimestampSchema,
    data: z
      .object({
        email_id: z.string().trim().min(1),
        bounce: z
          .object({
            type: z.string().optional(),
            subType: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type ResendWebhookEvent = z.infer<typeof resendWebhookEventSchema>;

export const resendEventTypeSchema = z.enum(RESEND_EVENT_TYPES);

export type ResendEventBehavior = {
  kind: ProviderEventKind | null;
  provesAcceptance: boolean;
  sourceOutcome: "FAILED" | "SUPPRESSED" | null;
};

export function getResendEventBehavior(
  eventType: ResendWebhookEvent["type"],
): ResendEventBehavior {
  switch (eventType) {
    case "email.sent":
      return { kind: "SENT", provesAcceptance: true, sourceOutcome: null };
    case "email.delivered":
      return { kind: "DELIVERED", provesAcceptance: true, sourceOutcome: null };
    case "email.delivery_delayed":
      return { kind: "DELAYED", provesAcceptance: true, sourceOutcome: null };
    case "email.bounced":
      return { kind: "BOUNCED", provesAcceptance: true, sourceOutcome: null };
    case "email.opened":
      return { kind: "OPENED", provesAcceptance: true, sourceOutcome: null };
    case "email.clicked":
      return { kind: "CLICKED", provesAcceptance: true, sourceOutcome: null };
    case "email.complained":
      return {
        kind: "COMPLAINED",
        provesAcceptance: true,
        sourceOutcome: null,
      };
    case "email.failed":
      return { kind: null, provesAcceptance: false, sourceOutcome: "FAILED" };
    case "email.suppressed":
      return {
        kind: null,
        provesAcceptance: false,
        sourceOutcome: "SUPPRESSED",
      };
    case "email.received":
    case "email.scheduled":
      return { kind: null, provesAcceptance: false, sourceOutcome: null };
  }
}
