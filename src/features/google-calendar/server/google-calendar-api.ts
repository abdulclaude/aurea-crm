import { z } from "zod";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import type { ResolvedOAuthGrant } from "@/features/provider-accounts/server/oauth-resolver";

import {
  googleCalendarEventsPageSchema,
  googleCalendarWatchSchema,
} from "./subscription-contracts";

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
export async function createCalendarWatch(input: {
  grant: ResolvedOAuthGrant;
  calendarId: string;
  channelId: string;
  webhookSecret: string;
  webhookUrl: string;
}) {
  return googleCalendarRequest(
    `/calendars/${encodeURIComponent(input.calendarId)}/events/watch`,
    {
      method: "POST",
      headers: authorizationHeaders(input.grant.accessToken, true),
      body: JSON.stringify({
        id: input.channelId,
        type: "web_hook",
        address: input.webhookUrl,
        token: input.webhookSecret,
        params: { ttl: "604800" },
      }),
    },
    googleCalendarWatchSchema,
    "create a Google Calendar watch channel",
    input.grant,
  );
}

export async function stopCalendarWatch(input: {
  grant: ResolvedOAuthGrant;
  channelId: string;
  resourceId: string;
}): Promise<void> {
  const response = await oauthAuthenticatedFetch(input.grant, `${GOOGLE_API_BASE}/channels/stop`, {
    method: "POST",
    headers: authorizationHeaders(input.grant.accessToken, true),
    body: JSON.stringify({
      id: input.channelId,
      resourceId: input.resourceId,
    }),
  });
  if (!response.ok && response.status !== 404) {
    throw await providerError(response, "stop a Google Calendar watch channel");
  }
}

export async function requestCalendarEvents(input: {
  grant: ResolvedOAuthGrant;
  calendarId: string;
  query: URLSearchParams;
}) {
  const response = await oauthAuthenticatedFetch(
    input.grant,
    `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events?${input.query.toString()}`,
    { headers: authorizationHeaders(input.grant.accessToken, false) },
  );
  if (response.status === 410) return { expiredSyncToken: true as const };
  if (!response.ok) {
    throw await providerError(response, "read Google Calendar changes");
  }
  const parsed = googleCalendarEventsPageSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new Error("Google Calendar returned an invalid events response.");
  }
  return { expiredSyncToken: false as const, page: parsed.data };
}

function authorizationHeaders(accessToken: string, json: boolean) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function googleCalendarRequest<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>,
  action: string,
  grant: ResolvedOAuthGrant,
): Promise<T> {
  const response = await oauthAuthenticatedFetch(grant, `${GOOGLE_API_BASE}${path}`, init);
  if (!response.ok) throw await providerError(response, action);
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new Error(`Google Calendar returned an invalid response while trying to ${action}.`);
  }
  return parsed.data;
}

async function providerError(response: Response, action: string) {
  await response.body?.cancel().catch(() => undefined);
  return new Error(`Unable to ${action} (${response.status}).`);
}
