"use server";

import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import type { ResolvedOAuthGrant } from "@/features/provider-accounts/server/oauth-resolver";

export type GmailProfile = {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
};

export async function fetchGmailProfile(grant: ResolvedOAuthGrant): Promise<GmailProfile> {
  const response = await oauthAuthenticatedFetch(
    grant,
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    {
      headers: {
        Authorization: `Bearer ${grant.accessToken}`,
      },
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.emailAddress) {
    throw new Error("Unable to fetch Gmail profile information.");
  }

  return payload as GmailProfile;
}
