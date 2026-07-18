import "server-only";

import { z } from "zod";

const platformResendEnvironmentSchema = z.object({
  apiKey: z.string().min(1),
  webhookSecret: z.string().min(1),
  previousWebhookSecret: z.string().min(1).optional(),
  fallbackFromEmail: z.string().email(),
  fallbackFromName: z.string().trim().min(1).max(120),
  fallbackReplyTo: z.string().email().optional(),
});

const twilioParentEnvironmentSchema = z.object({
  accountSid: z.string().regex(/^AC[a-fA-F0-9]{32}$/),
  authToken: z.string().min(1),
});

export type PlatformResendCredentials = z.infer<
  typeof platformResendEnvironmentSchema
>;

export type TwilioParentCredentials = z.infer<
  typeof twilioParentEnvironmentSchema
>;

export function getPlatformResendCredentials(): PlatformResendCredentials {
  return platformResendEnvironmentSchema.parse({
    apiKey: process.env.AUREA_PLATFORM_RESEND_API_KEY,
    webhookSecret: process.env.AUREA_PLATFORM_RESEND_WEBHOOK_SECRET,
    previousWebhookSecret:
      process.env.AUREA_PLATFORM_RESEND_PREVIOUS_WEBHOOK_SECRET || undefined,
    fallbackFromEmail: process.env.AUREA_PLATFORM_RESEND_FALLBACK_FROM_EMAIL,
    fallbackFromName: process.env.AUREA_PLATFORM_RESEND_FALLBACK_FROM_NAME,
    fallbackReplyTo:
      process.env.AUREA_PLATFORM_RESEND_FALLBACK_REPLY_TO || undefined,
  });
}

export function getTwilioParentCredentials(): TwilioParentCredentials {
  return twilioParentEnvironmentSchema.parse({
    accountSid: process.env.AUREA_TWILIO_PARENT_ACCOUNT_SID,
    authToken: process.env.AUREA_TWILIO_PARENT_AUTH_TOKEN,
  });
}

export function getCommunicationsPublicUrl(): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const parsed = z.string().url().parse(configured);
  const url = new URL(parsed);
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:"
  ) {
    throw new Error("Production communications webhooks require HTTPS APP_URL.");
  }
  return url.toString().replace(/\/$/, "");
}
