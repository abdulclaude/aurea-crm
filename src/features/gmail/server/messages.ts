"use server";

import { NonRetriableError } from "inngest";

export type GmailTriggerConfig = {
  variableName?: string;
  labelId?: string;
  query?: string;
  includeSpamTrash?: boolean;
  maxResults?: number;
};

export type GmailMessage = {
  id: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  headers: {
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
    cc?: string;
    bcc?: string;
  };
};

export type GmailMessageBundle = {
  fetchedAt: string;
  labelId: string;
  query?: string;
  messages: GmailMessage[];
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const headerValue = (
  headers: { name?: string; value?: string }[] | undefined,
  target: string
) =>
  headers?.find((header) => header.name?.toLowerCase() === target.toLowerCase())
    ?.value;

export async function fetchGmailMessages({
  accessToken,
  config,
}: {
  accessToken: string;
  config: GmailTriggerConfig;
}): Promise<GmailMessageBundle> {
  const labelId = config.labelId?.trim() || "INBOX";
  const maxResults = clampNumber(Number(config.maxResults) || 5, 1, 50);
  const includeSpamTrash = Boolean(config.includeSpamTrash);
  const query = config.query?.trim();

  const messages = await listMessages({
    accessToken,
    labelId,
    maxResults,
    includeSpamTrash,
    query,
  });

  return {
    fetchedAt: new Date().toISOString(),
    labelId,
    query,
    messages,
  };
}

async function listMessages({
  accessToken,
  labelId,
  maxResults,
  includeSpamTrash,
  query,
}: {
  accessToken: string;
  labelId: string;
  maxResults: number;
  includeSpamTrash: boolean;
  query?: string;
}): Promise<GmailMessage[]> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("labelIds", labelId);
  url.searchParams.set("maxResults", String(maxResults));
  if (query) {
    url.searchParams.set("q", query);
  }
  if (includeSpamTrash) {
    url.searchParams.set("includeSpamTrash", "true");
  }

  const listResponse = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new NonRetriableError(
      `Failed to list Gmail messages (${listResponse.status}): ${errorText}`
    );
  }

  const listPayload = await listResponse.json();
  const messageSummaries: Array<{ id: string; threadId?: string }> =
    Array.isArray(listPayload?.messages) ? listPayload.messages : [];

  if (!messageSummaries.length) {
    return [];
  }

  const detailRequests = messageSummaries.map(async (summary) => {
    const messageUrl = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${summary.id}`
    );
    messageUrl.searchParams.set("format", "metadata");
    ["Subject", "From", "To", "Date", "Cc", "Bcc"].forEach((header) =>
      messageUrl.searchParams.append("metadataHeaders", header)
    );

    const detailResponse = await fetch(messageUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!detailResponse.ok) {
      const err = await detailResponse.text();
      throw new NonRetriableError(
        `Failed to fetch Gmail message ${summary.id}: ${detailResponse.status} ${err}`
      );
    }

    const detailPayload = await detailResponse.json();
    const headers = Array.isArray(detailPayload?.payload?.headers)
      ? detailPayload.payload.headers
      : [];

    return {
      id: summary.id,
      threadId: detailPayload?.threadId,
      snippet: detailPayload?.snippet,
      labelIds: detailPayload?.labelIds,
      headers: {
        subject: headerValue(headers, "Subject"),
        from: headerValue(headers, "From"),
        to: headerValue(headers, "To"),
        date: headerValue(headers, "Date"),
        cc: headerValue(headers, "Cc"),
        bcc: headerValue(headers, "Bcc"),
      },
    } as GmailMessage;
  });

  return Promise.all(detailRequests);
}

