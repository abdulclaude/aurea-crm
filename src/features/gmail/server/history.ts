import "server-only";

import { NonRetriableError } from "inngest";
import { z } from "zod";

import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import type { ResolvedOAuthGrant } from "@/features/provider-accounts/server/oauth-resolver";

import {
  fetchGmailMessageById,
  type GmailMessage,
  type GmailTriggerConfig,
} from "./messages";

const MAX_HISTORY_PAGES = 20;
const PAGE_SIZE = 100;

const historyResponseSchema = z.object({
  history: z
    .array(
      z.object({
        messagesAdded: z
          .array(z.object({ message: z.object({ id: z.string().min(1) }) }))
          .optional(),
      }),
    )
    .default([]),
  nextPageToken: z.string().optional(),
});

const messageListSchema = z.object({
  messages: z.array(z.object({ id: z.string().min(1) })).default([]),
  nextPageToken: z.string().optional(),
});

export type GmailHistoryResult =
  | { status: "OK"; messages: GmailMessage[] }
  | { status: "CURSOR_EXPIRED"; messages: [] };

export async function fetchGmailHistoryMessages(input: {
  config: GmailTriggerConfig;
  grant: ResolvedOAuthGrant;
  startHistoryId: string;
}): Promise<GmailHistoryResult> {
  const messageIds = await listHistoryMessageIds(input);
  if (messageIds === null) return { status: "CURSOR_EXPIRED", messages: [] };

  const matchingIds = input.config.query?.trim()
    ? await listMatchingMessageIds(input)
    : null;
  const filteredIds = messageIds.filter(
    (id) => matchingIds === null || matchingIds.has(id),
  );
  const messages: GmailMessage[] = [];
  for (let offset = 0; offset < filteredIds.length; offset += 10) {
    messages.push(
      ...(await Promise.all(
        filteredIds
          .slice(offset, offset + 10)
          .map((id) => fetchGmailMessageById(input.grant, id)),
      )),
    );
  }
  return { status: "OK", messages };
}

async function listHistoryMessageIds(input: {
  config: GmailTriggerConfig;
  grant: ResolvedOAuthGrant;
  startHistoryId: string;
}): Promise<string[] | null> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
    url.searchParams.set("startHistoryId", input.startHistoryId);
    url.searchParams.set("historyTypes", "messageAdded");
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    url.searchParams.set("labelId", input.config.labelId?.trim() || "INBOX");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await oauthAuthenticatedFetch(input.grant, url, {
      headers: { Authorization: `Bearer ${input.grant.accessToken}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Gmail history request failed with status ${response.status}.`);
    }
    const parsed = historyResponseSchema.parse(await response.json());
    for (const entry of parsed.history) {
      for (const added of entry.messagesAdded ?? []) ids.add(added.message.id);
    }
    pageToken = parsed.nextPageToken;
    if (!pageToken) return [...ids];
  }
  throw new NonRetriableError("Gmail history exceeded the bounded processing window.");
}

async function listMatchingMessageIds(input: {
  config: GmailTriggerConfig;
  grant: ResolvedOAuthGrant;
}): Promise<Set<string>> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", input.config.query?.trim() ?? "");
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    const labelId = input.config.labelId?.trim();
    if (labelId) url.searchParams.set("labelIds", labelId);
    if (input.config.includeSpamTrash) url.searchParams.set("includeSpamTrash", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await oauthAuthenticatedFetch(input.grant, url, {
      headers: { Authorization: `Bearer ${input.grant.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Gmail query request failed with status ${response.status}.`);
    }
    const parsed = messageListSchema.parse(await response.json());
    parsed.messages.forEach((message) => ids.add(message.id));
    pageToken = parsed.nextPageToken;
    if (!pageToken) return ids;
  }
  throw new NonRetriableError("Gmail query exceeded the bounded processing window.");
}
