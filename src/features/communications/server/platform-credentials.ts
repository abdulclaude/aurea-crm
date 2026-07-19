import "server-only";

import { z } from "zod";

const platformResendApiEnvironmentSchema = z.object({
  apiKey: z.string().min(1),
});

const platformResendWebhookEnvironmentSchema = z.object({
  webhookSecret: z.string().min(1),
  previousWebhookSecret: z.string().min(1).optional(),
});

const platformResendSenderEnvironmentSchema = z
  .object({
    fallbackFromEmail: z.string().email().optional(),
    fallbackFromName: z.string().trim().min(1).max(120).optional(),
    fallbackReplyTo: z.string().email().optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.fallbackFromEmail) === Boolean(value.fallbackFromName)) {
      return;
    }
    ctx.addIssue({
      code: "custom",
      message:
        "Fallback sender email and name must either both be configured or both be omitted.",
    });
  });

type PlatformEnvironment = NodeJS.ProcessEnv;

export class PlatformResendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformResendConfigurationError";
  }
}

export type PlatformResendApiCredentials = z.infer<
  typeof platformResendApiEnvironmentSchema
>;

export type PlatformResendWebhookCredentials = z.infer<
  typeof platformResendWebhookEnvironmentSchema
>;

export type PlatformResendSenderDefaults = z.infer<
  typeof platformResendSenderEnvironmentSchema
>;

export function getPlatformResendApiCredentials(
  env: PlatformEnvironment = process.env,
): PlatformResendApiCredentials {
  return parsePlatformConfiguration(
    platformResendApiEnvironmentSchema,
    { apiKey: env.AUREA_PLATFORM_RESEND_API_KEY },
    "Aurea's managed Resend API key is not configured.",
  );
}

export function getPlatformResendWebhookCredentials(
  env: PlatformEnvironment = process.env,
): PlatformResendWebhookCredentials {
  return parsePlatformConfiguration(
    platformResendWebhookEnvironmentSchema,
    {
      webhookSecret: env.AUREA_PLATFORM_RESEND_WEBHOOK_SECRET,
      previousWebhookSecret:
        env.AUREA_PLATFORM_RESEND_PREVIOUS_WEBHOOK_SECRET || undefined,
    },
    "Aurea's managed Resend webhook signing secret is not configured.",
  );
}

export function getPlatformResendSenderDefaults(
  env: PlatformEnvironment = process.env,
): PlatformResendSenderDefaults {
  return parsePlatformConfiguration(
    platformResendSenderEnvironmentSchema,
    {
      fallbackFromEmail:
        env.AUREA_PLATFORM_RESEND_FALLBACK_FROM_EMAIL || undefined,
      fallbackFromName:
        env.AUREA_PLATFORM_RESEND_FALLBACK_FROM_NAME || undefined,
      fallbackReplyTo:
        env.AUREA_PLATFORM_RESEND_FALLBACK_REPLY_TO || undefined,
    },
    "Aurea's managed fallback sender configuration is invalid.",
  );
}

function parsePlatformConfiguration<TValue>(
  schema: z.ZodType<TValue>,
  value: unknown,
  message: string,
): TValue {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new PlatformResendConfigurationError(message);
  }
  return parsed.data;
}

const twilioParentEnvironmentSchema = z.object({
  accountSid: z.string().regex(/^AC[a-fA-F0-9]{32}$/),
  authToken: z.string().min(1),
});

export type TwilioParentCredentials = z.infer<
  typeof twilioParentEnvironmentSchema
>;

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
