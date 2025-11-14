"use server";

import { createId } from "@paralleldrive/cuid2";
import type {
  GoogleCalendarSubscription,
  Node as PrismaNode,
  Account,
} from "@/generated/prisma/client";

import { NodeType } from "@/generated/prisma/enums";
import prisma from "@/lib/db";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBHOOK_URL = resolveWebhookUrl();
const RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 24; // 24 hours

type TriggerNodeData = {
  calendarId?: string;
  calendarName?: string;
  listenFor?: string[];
  timezone?: string;
  variableName?: string;
};

type EventType = "created" | "updated" | "deleted";

export async function syncGoogleCalendarWorkflowSubscriptions({
  workflowId,
  userId,
}: {
  workflowId: string;
  userId: string;
}) {
  const nodes = await prisma.node.findMany({
    where: {
      workflowId,
      type: NodeType.GOOGLE_CALENDAR_TRIGGER,
    },
  });

  const existingSubscriptions =
    await prisma.googleCalendarSubscription.findMany({
      where: { workflowId },
    });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  // remove subscriptions whose node no longer exists
  await Promise.all(
    existingSubscriptions
      .filter((sub) => !nodeMap.has(sub.nodeId))
      .map((sub) => stopSubscription(sub))
  );

  if (nodes.length === 0) {
    return;
  }

  const existingByNode = new Map(
    existingSubscriptions.map((sub) => [sub.nodeId, sub])
  );

  for (const node of nodes) {
    const existing = existingByNode.get(node.id);
    await ensureSubscriptionForNode({
      node,
      workflowId,
      userId,
      existing,
    });
  }
}

export async function removeGoogleCalendarWorkflowSubscriptions(
  workflowId: string
) {
  const subs = await prisma.googleCalendarSubscription.findMany({
    where: { workflowId },
  });
  await Promise.all(subs.map((sub) => stopSubscription(sub)));
}

export async function removeGoogleCalendarSubscriptionsForUser(userId: string) {
  const subs = await prisma.googleCalendarSubscription.findMany({
    where: { userId },
  });
  await Promise.all(subs.map((sub) => stopSubscription(sub)));
}

export async function enqueueGoogleCalendarNotification(params: {
  subscriptionId: string;
  resourceState?: string | null;
  messageNumber?: string | null;
}) {
  await inngest.send({
    name: "google-calendar/subscription.notification",
    data: params,
  });
}

export async function processGoogleCalendarSubscription(
  subscriptionId: string
) {
  const subscription = await prisma.googleCalendarSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return;
  }

  if (!subscription.syncToken) {
    await recreateSubscription(subscription);
    return;
  }

  await fetchAndProcessChanges(subscription);
}

export async function renewExpiringGoogleCalendarSubscriptions() {
  const threshold = new Date(Date.now() + RENEWAL_WINDOW_MS);
  const subs = await prisma.googleCalendarSubscription.findMany({
    where: {
      expiresAt: {
        lte: threshold,
      },
    },
  });

  for (const sub of subs) {
    await recreateSubscription(sub);
  }

  return subs.length;
}

async function ensureSubscriptionForNode({
  node,
  workflowId,
  userId,
  existing,
  force = false,
}: {
  node: PrismaNode;
  workflowId: string;
  userId: string;
  existing?: GoogleCalendarSubscription;
  force?: boolean;
}) {
  const data = ((node.data || {}) as TriggerNodeData) || {};
  const listenFor = normalizeListenFor(data.listenFor);
  const variableName = sanitizeVariableName(data.variableName);

  if (!data.calendarId || listenFor.length === 0) {
    if (existing) {
      await stopSubscription(existing);
    }
    return;
  }

  const requiresRefresh =
    force ||
    !existing ||
    existing.calendarId !== data.calendarId ||
    !sameSet(existing.listenFor, listenFor) ||
    existing.variableName !== variableName ||
    !existing.syncToken ||
    !existing.expiresAt ||
    existing.expiresAt.getTime() - Date.now() < RENEWAL_WINDOW_MS / 2;

  if (!requiresRefresh) {
    if (existing && existing.variableName !== variableName) {
      await prisma.googleCalendarSubscription.update({
        where: { id: existing.id },
        data: { variableName },
      });
    }
    return;
  }

  if (existing) {
    await stopSubscription(existing);
  }

  const accessToken = await ensureGoogleAccessToken(userId);
  const syncToken = await fetchInitialSyncToken(accessToken, data.calendarId);
  const webhookToken = createId();
  const channelId = createId();

  const watchResponse = await googleApiFetch(
    `/calendars/${encodeURIComponent(data.calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: WEBHOOK_URL,
        token: webhookToken,
        params: {
          ttl: "604800",
        },
      }),
    }
  );

  const payload = await watchResponse.json().catch(() => ({}));
  if (!watchResponse.ok) {
    throw new Error(
      payload?.error?.message ||
        "Failed to create Google Calendar watch channel."
    );
  }

  const expiresAt =
    payload?.expiration !== undefined
      ? new Date(Number(payload.expiration))
      : null;

  await prisma.googleCalendarSubscription.upsert({
    where: { nodeId: node.id },
    update: {
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      listenFor,
      channelId,
      resourceId: payload.resourceId,
      webhookToken,
      syncToken,
      expiresAt,
      lastSyncedAt: new Date(),
      timezone: data.timezone,
      userId,
      workflowId,
      variableName,
    },
    create: {
      nodeId: node.id,
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      listenFor,
      channelId,
      resourceId: payload.resourceId,
      webhookToken,
      syncToken,
      expiresAt,
      lastSyncedAt: new Date(),
      timezone: data.timezone,
      userId,
      workflowId,
      variableName,
    },
  });
}

async function fetchAndProcessChanges(
  subscription: GoogleCalendarSubscription
) {
  const accessToken = await ensureGoogleAccessToken(subscription.userId);
  const currentSyncToken = subscription.syncToken;

  if (!currentSyncToken) {
    await recreateSubscription(subscription);
    return;
  }

  let nextSyncToken = currentSyncToken;
  let pageToken: string | undefined;

  while (true) {
    const searchParams = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "true",
      syncToken: nextSyncToken,
    });

    if (pageToken) {
      searchParams.set("pageToken", pageToken);
    }

    const response = await googleApiFetch(
      `/calendars/${encodeURIComponent(
        subscription.calendarId
      )}/events?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 410) {
      await recreateSubscription(subscription);
      return;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          "Failed to fetch Google Calendar changes for workflow trigger."
      );
    }

    const items: GoogleCalendarEvent[] = Array.isArray(payload.items)
      ? (payload.items as GoogleCalendarEvent[])
      : [];

    for (const event of items) {
      const eventType = resolveEventType(event);
      if (!subscription.listenFor.includes(eventType)) {
        continue;
      }

      const eventPayload = {
        subscriptionId: subscription.id,
        nodeId: subscription.nodeId,
        calendarId: subscription.calendarId,
        calendarName: subscription.calendarName,
        eventType,
        timezone: subscription.timezone,
        event,
      };

      const variableKey = sanitizeVariableName(subscription.variableName);
      const initialData: Record<string, unknown> = {
        [variableKey]: eventPayload,
      };

      if (variableKey !== "googleCalendar") {
        initialData.googleCalendar = eventPayload;
      }

      await sendWorkflowExecution({
        workflowId: subscription.workflowId,
        initialData,
      });
    }

    pageToken = payload.nextPageToken ?? undefined;
    if (payload.nextSyncToken) {
      nextSyncToken = payload.nextSyncToken;
    }

    if (!pageToken) {
      break;
    }
  }

  await prisma.googleCalendarSubscription.update({
    where: { id: subscription.id },
    data: {
      syncToken: nextSyncToken,
      lastSyncedAt: new Date(),
    },
  });
}

async function recreateSubscription(subscription: GoogleCalendarSubscription) {
  const node = await prisma.node.findUnique({
    where: { id: subscription.nodeId },
  });

  if (!node || node.type !== NodeType.GOOGLE_CALENDAR_TRIGGER) {
    await prisma.googleCalendarSubscription
      .delete({ where: { id: subscription.id } })
      .catch(() => {});
    return;
  }

  await ensureSubscriptionForNode({
    node,
    workflowId: subscription.workflowId,
    userId: subscription.userId,
    existing: subscription,
    force: true,
  });
}

async function stopSubscription(subscription: GoogleCalendarSubscription) {
  try {
    const accessToken = await ensureGoogleAccessToken(subscription.userId);
    await googleApiFetch("/channels/stop", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: subscription.channelId,
        resourceId: subscription.resourceId,
      }),
    });
  } catch (error) {
    console.warn(
      `[GoogleCalendar] Failed to stop channel ${subscription.channelId}:`,
      error
    );
  } finally {
    await prisma.googleCalendarSubscription
      .delete({
        where: { id: subscription.id },
      })
      .catch(() => {});
  }
}

async function ensureGoogleAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "google",
    },
  });

  if (!account) {
    throw new Error(
      "Google Calendar requires a connected Google account. Connect Google Calendar under Integrations."
    );
  }

  if (
    account.accessToken &&
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    throw new Error(
      "Google Calendar access token expired and no refresh token is available. Reconnect Google Calendar."
    );
  }

  return refreshGoogleAccessToken(account);
}

async function refreshGoogleAccessToken(account: Account) {
  const refreshToken = account.refreshToken;
  if (!refreshToken) {
    throw new Error("Google account is missing a refresh token.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to refresh Google Calendar access token."
    );
  }

  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000);

  await prisma.account.update({
    where: { id: account.id },
    data: {
      accessToken: payload.access_token,
      accessTokenExpiresAt: expiresAt,
      refreshToken: payload.refresh_token ?? refreshToken,
    },
  });

  return payload.access_token as string;
}

async function fetchInitialSyncToken(accessToken: string, calendarId: string) {
  const baseParams = new URLSearchParams({
    singleEvents: "true",
    showDeleted: "true",
    orderBy: "updated",
    timeMin: new Date().toISOString(),
  });

  let syncToken = await requestSyncToken(accessToken, calendarId, baseParams);

  if (!syncToken) {
    baseParams.delete("timeMin");
    syncToken = await requestSyncToken(accessToken, calendarId, baseParams);
  }

  if (!syncToken) {
    throw new Error(
      "Unable to initialize Google Calendar sync token. Try selecting a different calendar."
    );
  }

  return syncToken;
}

async function requestSyncToken(
  accessToken: string,
  calendarId: string,
  params: URLSearchParams
) {
  let pageToken: string | undefined;

  while (true) {
    const query = new URLSearchParams(params);
    if (pageToken) {
      query.set("pageToken", pageToken);
    }

    const response = await googleApiFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(
        "[GoogleCalendar] Failed to request sync token:",
        payload?.error?.message || response.statusText
      );
      return null;
    }

    if (payload.nextSyncToken) {
      return payload.nextSyncToken;
    }

    pageToken = payload.nextPageToken ?? undefined;
    if (!pageToken) {
      break;
    }
  }

  return null;
}

type GoogleCalendarEvent = {
  status?: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
};

function resolveEventType(event: GoogleCalendarEvent): EventType {
  if (event.status === "cancelled") {
    return "deleted";
  }

  const created = event.created ? Date.parse(event.created) : NaN;
  const updated = event.updated ? Date.parse(event.updated) : NaN;

  if (
    !Number.isNaN(created) &&
    !Number.isNaN(updated) &&
    updated - created > 0
  ) {
    return "updated";
  }

  return "created";
}

function normalizeListenFor(values?: string[]) {
  if (!Array.isArray(values)) {
    return [] as EventType[];
  }

  const allowed: EventType[] = ["created", "updated", "deleted"];
  const set = new Set<EventType>();
  for (const value of values) {
    const normalized = value?.toLowerCase() as EventType;
    if (allowed.includes(normalized)) {
      set.add(normalized);
    }
  }
  return Array.from(set);
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

async function googleApiFetch(path: string, init: RequestInit) {
  const url = path.startsWith("http")
    ? path
    : `${GOOGLE_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, init);
}

function sanitizeVariableName(value?: string | null) {
  const fallback = "googleCalendar";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function resolveWebhookUrl() {
  const base =
    process.env.GOOGLE_CALENDAR_WEBHOOK_BASE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";

  if (!base) {
    throw new Error(
      "Set GOOGLE_CALENDAR_WEBHOOK_BASE_URL (must be HTTPS) so Google Calendar can reach your server."
    );
  }

  if (!base.startsWith("https://")) {
    throw new Error(
      `Google Calendar webhook base must be HTTPS. Received: "${base}".`
    );
  }

  return `${base.replace(/\/$/, "")}/api/webhooks/google-calendar`;
}
