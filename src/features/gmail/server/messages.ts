"use server";

import { NonRetriableError } from "inngest";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import type { ResolvedOAuthGrant } from "@/features/provider-accounts/server/oauth-resolver";

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
  grant,
  config,
}: {
  grant: ResolvedOAuthGrant;
  config: GmailTriggerConfig;
}): Promise<GmailMessageBundle> {
  const { accessToken } = grant;
  const labelId = config.labelId?.trim() || "INBOX";
  const maxResults = clampNumber(Number(config.maxResults) || 5, 1, 50);
  const includeSpamTrash = Boolean(config.includeSpamTrash);
  const query = config.query?.trim();

  const messages = await listMessages({
    accessToken,
    grant,
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
  grant,
  labelId,
  maxResults,
  includeSpamTrash,
  query,
}: {
  accessToken: string;
  grant: ResolvedOAuthGrant;
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

  const listResponse = await oauthAuthenticatedFetch(grant, url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!listResponse.ok) {
    throw new NonRetriableError(
      `Failed to list Gmail messages with status ${listResponse.status}.`,
    );
  }

  const listPayload = await listResponse.json();
  const messageSummaries: Array<{ id: string; threadId?: string }> =
    Array.isArray(listPayload?.messages) ? listPayload.messages : [];

  if (!messageSummaries.length) {
    return [];
  }

  const detailRequests = messageSummaries.map((summary) =>
    fetchGmailMessageById(grant, summary.id),
  );

  return Promise.all(detailRequests);
}

export async function fetchGmailMessageById(
  grant: ResolvedOAuthGrant,
  messageId: string,
): Promise<GmailMessage> {
  const messageUrl = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`,
  );
  messageUrl.searchParams.set("format", "metadata");
  ["Subject", "From", "To", "Date", "Cc", "Bcc"].forEach((header) =>
    messageUrl.searchParams.append("metadataHeaders", header),
  );

  const detailResponse = await oauthAuthenticatedFetch(grant, messageUrl, {
    headers: { Authorization: `Bearer ${grant.accessToken}` },
  });
  if (!detailResponse.ok) {
    throw new NonRetriableError(
      `Failed to fetch a Gmail message with status ${detailResponse.status}.`,
    );
  }

  const detailPayload = (await detailResponse.json()) as Record<string, unknown>;
  const payload =
    typeof detailPayload.payload === "object" && detailPayload.payload !== null
      ? (detailPayload.payload as Record<string, unknown>)
      : {};
  const headers = Array.isArray(payload.headers)
    ? (payload.headers as { name?: string; value?: string }[])
    : [];
  return {
    id: messageId,
    threadId:
      typeof detailPayload.threadId === "string"
        ? detailPayload.threadId
        : undefined,
    snippet:
      typeof detailPayload.snippet === "string" ? detailPayload.snippet : undefined,
    labelIds: Array.isArray(detailPayload.labelIds)
      ? detailPayload.labelIds.filter((value): value is string => typeof value === "string")
      : undefined,
    headers: {
      subject: headerValue(headers, "Subject"),
      from: headerValue(headers, "From"),
      to: headerValue(headers, "To"),
      date: headerValue(headers, "Date"),
      cc: headerValue(headers, "Cc"),
      bcc: headerValue(headers, "Bcc"),
    },
  };
}
