import { z } from "zod";

import type { OAuthProviderAccount } from "@/features/provider-accounts/contracts";

export type OAuthHealthPayloadState =
  | "HEALTHY"
  | "REAUTHORIZATION_REQUIRED"
  | "DEGRADED";

const googleProfileSchema = z.object({ emailAddress: z.string().min(1) });
const microsoftMessagesSchema = z.object({ value: z.array(z.unknown()) });
const slackAuthSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
const discordProfileSchema = z.object({ id: z.string().min(1) });

const SLACK_AUTH_ERRORS = new Set([
  "account_inactive",
  "invalid_auth",
  "not_authed",
  "token_expired",
  "token_revoked",
]);

export function getOAuthHealthEndpoint(
  provider: OAuthProviderAccount,
): string {
  switch (provider) {
    case "GOOGLE_WORKSPACE":
      return "https://gmail.googleapis.com/gmail/v1/users/me/profile";
    case "MICROSOFT_365":
      return "https://graph.microsoft.com/v1.0/me/messages?$top=1&$select=id";
    case "SLACK_OAUTH":
      return "https://slack.com/api/auth.test";
    case "DISCORD_OAUTH":
      return "https://discord.com/api/v10/users/@me";
  }
}

export function classifyOAuthHealthPayload(
  provider: OAuthProviderAccount,
  payload: unknown,
): OAuthHealthPayloadState {
  switch (provider) {
    case "GOOGLE_WORKSPACE":
      return googleProfileSchema.safeParse(payload).success
        ? "HEALTHY"
        : "DEGRADED";
    case "MICROSOFT_365":
      return microsoftMessagesSchema.safeParse(payload).success
        ? "HEALTHY"
        : "DEGRADED";
    case "DISCORD_OAUTH":
      return discordProfileSchema.safeParse(payload).success
        ? "HEALTHY"
        : "DEGRADED";
    case "SLACK_OAUTH": {
      const parsed = slackAuthSchema.safeParse(payload);
      if (!parsed.success) return "DEGRADED";
      if (parsed.data.ok) return "HEALTHY";
      return parsed.data.error && SLACK_AUTH_ERRORS.has(parsed.data.error)
        ? "REAUTHORIZATION_REQUIRED"
        : "DEGRADED";
    }
  }
}
