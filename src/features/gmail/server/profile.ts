"use server";

export type GmailProfile = {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
};

export async function fetchGmailProfile(accessToken: string): Promise<GmailProfile> {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.emailAddress) {
    throw new Error("Unable to fetch Gmail profile information.");
  }

  return payload as GmailProfile;
}

