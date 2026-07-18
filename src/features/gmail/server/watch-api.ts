import "server-only";

import { z } from "zod";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import type { ResolvedOAuthGrant } from "@/features/provider-accounts/server/oauth-resolver";

import { fetchGmailProfile } from "./profile";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

const gmailWatchResponseSchema = z.object({
  historyId: z.string().regex(/^\d+$/).optional(),
  expiration: z.union([z.string(), z.number()]).optional(),
});

export type GmailWatchResult = {
  emailAddress: string;
  expiresAt: Date | null;
  historyId?: string;
};

export async function createGmailWatch(input: {
  grant: ResolvedOAuthGrant;
  labelIds: string[];
  topicName: string;
}): Promise<GmailWatchResult> {
  const profile = await fetchGmailProfile(input.grant);
  const response = await oauthAuthenticatedFetch(input.grant, `${GMAIL_API_BASE}/users/me/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.grant.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName: input.topicName,
      labelIds: input.labelIds,
      labelFilterBehavior: "INCLUDE",
    }),
  });
  if (!response.ok) {
    throw new Error(`Gmail watch request failed with status ${response.status}.`);
  }
  const payload = gmailWatchResponseSchema.parse(
    (await response.json()) as unknown,
  );
  return {
    emailAddress: profile.emailAddress.trim().toLowerCase(),
    expiresAt: expirationDate(payload.expiration),
    historyId: payload.historyId,
  };
}

export async function stopGmailWatch(grant: ResolvedOAuthGrant): Promise<void> {
  const response = await oauthAuthenticatedFetch(grant, `${GMAIL_API_BASE}/users/me/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${grant.accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Gmail stop request failed with status ${response.status}.`);
  }
}

function expirationDate(value?: string | number): Date | null {
  if (value === undefined) return null;
  const milliseconds = Number(value);
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) return null;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}
