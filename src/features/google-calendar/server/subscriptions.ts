"use server";

import { createHash, randomBytes } from "node:crypto";

import type { InferSelectModel } from "drizzle-orm";
import { and, eq, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  googleCalendarSubscription,
  node as workflowNode,
  workflows,
} from "@/db/schema";
import { GOOGLE_CALENDAR_REQUIRED_SCOPES } from "@/features/apps/constants";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";

import {
  createCalendarWatch,
  requestCalendarEvents,
  stopCalendarWatch,
} from "./google-calendar-api";
import {
  hashWebhookSecret,
  normalizeCalendarEvents,
  resolveCalendarEventType,
  sanitizeVariableName,
  type GoogleCalendarEventType,
} from "./subscription-contracts";

const RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1_000;
const MAX_CHANGE_PAGES = 100;

type Subscription = InferSelectModel<typeof googleCalendarSubscription>;
type CalendarNode = InferSelectModel<typeof workflowNode>;

export type ProviderSubscriptionScope = {
  organizationId: string;
  locationId: string | null;
  actorUserId?: string | null;
};

type TriggerNodeData = {
  calendarId?: string;
  calendarName?: string;
  listenFor?: string[];
  timezone?: string;
  variableName?: string;
};

export async function syncGoogleCalendarWorkflowSubscriptions(
  input: ProviderSubscriptionScope & { workflowId: string },
): Promise<void> {
  const nodes = await getScopedCalendarNodes(input);
  const existing = await db.query.googleCalendarSubscription.findMany({
    where: and(
      eq(googleCalendarSubscription.workflowId, input.workflowId),
      eq(googleCalendarSubscription.organizationId, input.organizationId),
      locationCondition(input.locationId),
    ),
  });
  const activeNodeIds = new Set(nodes.map((node) => node.id));
  for (const subscription of existing) {
    if (!activeNodeIds.has(subscription.nodeId)) await stopSubscription(subscription);
  }
  if (nodes.length === 0) return;

  const providerAccountIds = [
    ...new Set(
      nodes.map((node) => {
        if (!node.providerAccountId) {
          throw new Error(
            "Google Calendar trigger provider account binding is missing.",
          );
        }
        return node.providerAccountId;
      }),
    ),
  ];
  const grants = await Promise.all(
    providerAccountIds.map((providerAccountId) =>
      resolveOAuthProviderGrant({
        provider: "GOOGLE_WORKSPACE",
        providerAccountId,
        scope: input,
        requiredScopes: GOOGLE_CALENDAR_REQUIRED_SCOPES,
      }),
    ),
  );
  const grantByAccountId = new Map(
    grants.map((grant) => [grant.providerAccountId, grant]),
  );
  const byNode = new Map(existing.map((subscription) => [subscription.nodeId, subscription]));
  for (const node of nodes) {
    const grant = node.providerAccountId
      ? grantByAccountId.get(node.providerAccountId)
      : null;
    if (!grant) {
      throw new Error(
        "Google Calendar trigger provider account is unavailable.",
      );
    }
    await ensureSubscriptionForNode({
      node,
      scope: input,
      grant,
      providerAccountId: grant.providerAccountId,
      existing: byNode.get(node.id),
    });
  }
}

export async function removeGoogleCalendarWorkflowSubscriptions(
  input: ProviderSubscriptionScope & { workflowId: string },
): Promise<void> {
  const subscriptions = await db.query.googleCalendarSubscription.findMany({
    where: and(
      eq(googleCalendarSubscription.workflowId, input.workflowId),
      eq(googleCalendarSubscription.organizationId, input.organizationId),
      locationCondition(input.locationId),
    ),
  });
  for (const subscription of subscriptions) await stopSubscription(subscription);
}

export async function enqueueGoogleCalendarNotification(input: {
  subscriptionId: string;
  resourceState?: string | null;
  messageNumber: string;
}): Promise<void> {
  await inngest.send({
    id: `google-calendar:${input.subscriptionId}:${input.messageNumber}`,
    name: "google-calendar/subscription.notification",
    data: input,
  });
}

export async function processGoogleCalendarSubscription(
  subscriptionId: string,
): Promise<void> {
  const subscription = await db.query.googleCalendarSubscription.findFirst({
    where: eq(googleCalendarSubscription.id, subscriptionId),
  });
  if (!subscription) return;
  if (!subscription.syncToken) {
    await recreateSubscription(subscription);
    return;
  }
  await fetchAndProcessChanges(subscription);
}

export async function renewExpiringGoogleCalendarSubscriptions(): Promise<number> {
  const threshold = new Date(Date.now() + RENEWAL_WINDOW_MS);
  const subscriptions = await db.query.googleCalendarSubscription.findMany({
    where: lte(googleCalendarSubscription.expiresAt, threshold),
  });
  for (const subscription of subscriptions) {
    try {
      await recreateSubscription(subscription);
    } catch {
      console.error("[GoogleCalendar] Subscription renewal failed.", {
        providerAccountId: subscription.providerAccountId,
        subscriptionId: subscription.id,
      });
    }
  }
  return subscriptions.length;
}

async function getScopedCalendarNodes(
  input: ProviderSubscriptionScope & { workflowId: string },
): Promise<CalendarNode[]> {
  return db
    .select({ node: workflowNode })
    .from(workflowNode)
    .innerJoin(workflows, eq(workflowNode.workflowId, workflows.id))
    .where(
      and(
        eq(workflowNode.workflowId, input.workflowId),
        eq(workflowNode.type, NodeType.GOOGLE_CALENDAR_TRIGGER),
        eq(workflows.organizationId, input.organizationId),
        workflowLocationCondition(input.locationId),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
      ),
    )
    .then((rows) => rows.map((row) => row.node));
}

async function ensureSubscriptionForNode(input: {
  node: CalendarNode;
  scope: ProviderSubscriptionScope;
  providerAccountId: string;
  grant: Awaited<ReturnType<typeof resolveOAuthProviderGrant>>;
  existing?: Subscription;
  force?: boolean;
}): Promise<void> {
  const data = (input.node.data ?? {}) as TriggerNodeData;
  const listenFor = normalizeCalendarEvents(data.listenFor);
  const variableName = sanitizeVariableName(data.variableName);
  if (!data.calendarId || listenFor.length === 0) {
    if (input.existing) await stopSubscription(input.existing);
    return;
  }

  const requiresRefresh =
    input.force ||
    !input.existing ||
    input.existing.providerAccountId !== input.providerAccountId ||
    input.existing.calendarId !== data.calendarId ||
    !sameSet(input.existing.listenFor ?? [], listenFor) ||
    !input.existing.syncToken ||
    !input.existing.expiresAt ||
    input.existing.expiresAt.getTime() - Date.now() < RENEWAL_WINDOW_MS / 2;
  if (!requiresRefresh && input.existing) {
    if (input.existing.variableName !== variableName) {
      await db
        .update(googleCalendarSubscription)
        .set({ variableName, updatedAt: new Date() })
        .where(eq(googleCalendarSubscription.id, input.existing.id));
    }
    return;
  }
  if (
    input.existing &&
    input.existing.providerAccountId !== input.providerAccountId
  ) {
    await stopSubscription(input.existing);
  }

  const syncToken = await fetchInitialSyncToken(
    input.grant,
    data.calendarId,
  );
  const webhookSecret = randomBytes(32).toString("base64url");
  const channelId = crypto.randomUUID();
  const watch = await createCalendarWatch({
    grant: input.grant,
    calendarId: data.calendarId,
    channelId,
    webhookSecret,
    webhookUrl: resolveWebhookUrl(),
  });
  const expiresAt = watch.expiration
    ? new Date(Number(watch.expiration))
    : null;

  try {
    const update = {
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      listenFor,
      channelId,
      resourceId: watch.resourceId,
      webhookTokenHash: hashWebhookSecret(webhookSecret),
      syncToken,
      expiresAt,
      lastSyncedAt: new Date(),
      lastMessageNumber: null,
      timezone: data.timezone,
      variableName,
      userId: input.scope.actorUserId ?? input.existing?.userId ?? null,
      updatedAt: new Date(),
    };
    if (
      input.existing &&
      input.existing.providerAccountId === input.providerAccountId
    ) {
      await db
        .update(googleCalendarSubscription)
        .set(update)
        .where(eq(googleCalendarSubscription.id, input.existing.id));
    } else {
      await db.insert(googleCalendarSubscription).values({
        id: crypto.randomUUID(),
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        providerAccountId: input.providerAccountId,
        workflowId: input.node.workflowId,
        nodeId: input.node.id,
        createdAt: new Date(),
        ...update,
      });
    }
  } catch (error) {
    await stopCalendarWatch({
      grant: input.grant,
      channelId,
      resourceId: watch.resourceId,
    }).catch(() => undefined);
    throw error;
  }

  if (
    input.existing &&
    input.existing.providerAccountId === input.providerAccountId &&
    input.existing.channelId !== channelId
  ) {
    await stopCalendarWatch({
      grant: input.grant,
      channelId: input.existing.channelId,
      resourceId: input.existing.resourceId,
    }).catch(() => undefined);
  }
}

async function fetchAndProcessChanges(subscription: Subscription): Promise<void> {
  const grant = await resolveSubscriptionGrant(subscription);
  let pageToken: string | undefined;
  let nextSyncToken = subscription.syncToken;
  for (let pageCount = 0; pageCount < MAX_CHANGE_PAGES; pageCount += 1) {
    const query = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "true",
      syncToken: subscription.syncToken ?? "",
    });
    if (pageToken) query.set("pageToken", pageToken);
    const result = await requestCalendarEvents({
      grant,
      calendarId: subscription.calendarId,
      query,
    });
    if (result.expiredSyncToken) {
      await recreateSubscription(subscription);
      return;
    }
    for (const event of result.page.items) {
      const eventType = resolveCalendarEventType(event);
      if (!(subscription.listenFor ?? []).includes(eventType)) continue;
      await dispatchCalendarEvent(subscription, eventType, event);
    }
    pageToken = result.page.nextPageToken;
    nextSyncToken = result.page.nextSyncToken ?? nextSyncToken;
    if (!pageToken) {
      await db
        .update(googleCalendarSubscription)
        .set({ syncToken: nextSyncToken, lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(googleCalendarSubscription.id, subscription.id));
      return;
    }
  }
  throw new Error("Google Calendar returned too many change pages.");
}

async function dispatchCalendarEvent(
  subscription: Subscription,
  eventType: GoogleCalendarEventType,
  event: Record<string, unknown> & { id: string; updated?: string; status?: string },
): Promise<void> {
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
  const initialData: Record<string, unknown> = { [variableKey]: eventPayload };
  if (variableKey !== "googleCalendar") initialData.googleCalendar = eventPayload;
  const eventKey = createHash("sha256")
    .update(`${subscription.id}:${event.id}:${event.updated ?? event.status ?? eventType}`)
    .digest("hex");
  await sendWorkflowExecution({
    workflowId: subscription.workflowId,
    initialData,
    idempotencyKey: `google-calendar-event:${eventKey}`,
    expectedOrganizationId: subscription.organizationId,
    expectedLocationId: subscription.locationId,
  });
}

async function recreateSubscription(subscription: Subscription): Promise<void> {
  const [node] = await getScopedCalendarNodes({
    workflowId: subscription.workflowId,
    organizationId: subscription.organizationId,
    locationId: subscription.locationId,
  });
  if (!node || node.id !== subscription.nodeId) {
    await stopSubscription(subscription);
    return;
  }
  if (!node.providerAccountId) {
    await stopSubscription(subscription);
    return;
  }
  const grant = await resolveOAuthProviderGrant({
    providerAccountId: node.providerAccountId,
    provider: "GOOGLE_WORKSPACE",
    scope: subscription,
    requiredScopes: GOOGLE_CALENDAR_REQUIRED_SCOPES,
  });
  await ensureSubscriptionForNode({
    node,
    scope: subscription,
    providerAccountId: grant.providerAccountId,
    grant,
    existing: subscription,
    force: true,
  });
}

async function stopSubscription(subscription: Subscription): Promise<void> {
  try {
    const grant = await resolveSubscriptionGrant(subscription);
    await stopCalendarWatch({
      grant,
      channelId: subscription.channelId,
      resourceId: subscription.resourceId,
    });
  } catch {
    console.warn("[GoogleCalendar] Remote channel cleanup failed.", {
      providerAccountId: subscription.providerAccountId,
      subscriptionId: subscription.id,
    });
  } finally {
    await db
      .delete(googleCalendarSubscription)
      .where(eq(googleCalendarSubscription.id, subscription.id));
  }
}

function resolveSubscriptionGrant(subscription: Subscription) {
  return resolveOAuthProviderGrant({
    providerAccountId: subscription.providerAccountId,
    provider: "GOOGLE_WORKSPACE",
    scope: subscription,
    requiredScopes: GOOGLE_CALENDAR_REQUIRED_SCOPES,
  });
}

async function fetchInitialSyncToken(
  grant: Awaited<ReturnType<typeof resolveOAuthProviderGrant>>,
  calendarId: string,
): Promise<string> {
  for (const includeTimeMin of [true, false]) {
    let pageToken: string | undefined;
    for (let pageCount = 0; pageCount < MAX_CHANGE_PAGES; pageCount += 1) {
      const query = new URLSearchParams({
        singleEvents: "true",
        showDeleted: "true",
        orderBy: "updated",
      });
      if (includeTimeMin) query.set("timeMin", new Date().toISOString());
      if (pageToken) query.set("pageToken", pageToken);
      const result = await requestCalendarEvents({ grant, calendarId, query });
      if (result.expiredSyncToken) break;
      if (result.page.nextSyncToken) return result.page.nextSyncToken;
      pageToken = result.page.nextPageToken;
      if (!pageToken) break;
    }
  }
  throw new Error("Unable to initialize Google Calendar synchronization.");
}

function locationCondition(locationId: string | null) {
  return locationId
    ? eq(googleCalendarSubscription.locationId, locationId)
    : isNull(googleCalendarSubscription.locationId);
}

function workflowLocationCondition(locationId: string | null) {
  return locationId ? eq(workflows.locationId, locationId) : isNull(workflows.locationId);
}

function sameSet(left: string[], right: string[]): boolean {
  const values = new Set(left);
  return left.length === right.length && right.every((value) => values.has(value));
}

function resolveWebhookUrl(): string {
  const base =
    process.env.GOOGLE_CALENDAR_WEBHOOK_BASE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !base.startsWith("https://")) {
    throw new Error("Google Calendar subscriptions require an HTTPS webhook base URL.");
  }
  return `${base.replace(/\/$/, "")}/api/webhooks/google-calendar`;
}
