"use server";

import { and, eq, inArray, lte } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import {
  account as accountTable,
  apps,
  gmailSubscription,
  gmailTriggerState,
  node as workflowNode,
  workflows,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { AppProvider, NodeType } from "@/db/enums";
import { fetchGmailMessages, type GmailTriggerConfig } from "./messages";
import { fetchGmailProfile } from "./profile";

const WATCH_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 6; // 6 hours
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

type SyncParams = {
  userId: string;
};
type Account = InferSelectModel<typeof accountTable>;
type GmailSubscription = InferSelectModel<typeof gmailSubscription>;
type TriggerNode = Pick<
  InferSelectModel<typeof workflowNode>,
  "id" | "workflowId" | "data"
>;

const gmailWorkflowNodesWhere = (userId: string) =>
  and(
    eq(workflowNode.type, NodeType.GMAIL_TRIGGER),
    eq(workflows.userId, userId),
    eq(workflows.archived, false),
    eq(workflows.isTemplate, false),
  );

async function getGmailTriggerNodes(userId: string): Promise<TriggerNode[]> {
  return await db
    .select({
      id: workflowNode.id,
      workflowId: workflowNode.workflowId,
      data: workflowNode.data,
    })
    .from(workflowNode)
    .innerJoin(workflows, eq(workflowNode.workflowId, workflows.id))
    .where(gmailWorkflowNodesWhere(userId));
}

async function deleteGmailTriggerStatesForUser(
  userId: string,
  exceptNodeIds?: string[],
): Promise<void> {
  const rows = await db
    .select({ id: gmailTriggerState.id, nodeId: gmailTriggerState.nodeId })
    .from(gmailTriggerState)
    .innerJoin(workflows, eq(gmailTriggerState.workflowId, workflows.id))
    .where(eq(workflows.userId, userId));

  const ids = rows
    .filter((row) => !exceptNodeIds || !exceptNodeIds.includes(row.nodeId))
    .map((row) => row.id);

  if (ids.length > 0) {
    await db.delete(gmailTriggerState).where(inArray(gmailTriggerState.id, ids));
  }
}

export async function syncGmailWorkflowSubscriptions({ userId }: SyncParams) {
  try {
    const gmailApp = await db.query.apps.findFirst({
      where: and(eq(apps.userId, userId), eq(apps.provider, AppProvider.GMAIL)),
    });

    if (!gmailApp) {
      await stopGmailWatchForUser(userId);
      await deleteGmailTriggerStatesForUser(userId);
      return;
    }

    const nodes = await getGmailTriggerNodes(userId);

    if (nodes.length > 0) {
      const activeNodeIds = nodes.map((node) => node.id);
      await deleteGmailTriggerStatesForUser(userId, activeNodeIds);
    } else {
      await deleteGmailTriggerStatesForUser(userId);
    }

    if (nodes.length === 0) {
      await stopGmailWatchForUser(userId);
      return;
    }

    const labelIds = buildLabelSet(nodes);
    await ensureGmailWatch({
      userId,
      labelIds,
    });
  } catch (error) {
    console.error(
      `[Gmail] Failed to sync workflow subscriptions for user ${userId}:`,
      error
    );
  }
}

export async function removeGmailSubscriptionsForUser(userId: string) {
  await stopGmailWatchForUser(userId);
  await deleteGmailTriggerStatesForUser(userId);
}

export async function enqueueGmailNotification({
  subscriptionId,
  historyId,
}: {
  subscriptionId: string;
  historyId?: string;
}) {
  await inngest.send({
    name: "gmail/subscription.notification",
    data: {
      subscriptionId,
      historyId,
    },
  });
}

export async function processGmailNotification({
  subscriptionId,
  historyId,
}: {
  subscriptionId: string;
  historyId?: string;
}) {
  const subscription = await db.query.gmailSubscription.findFirst({
    where: eq(gmailSubscription.id, subscriptionId),
  });

  if (!subscription) {
    return;
  }

  await db
    .update(gmailSubscription)
    .set({
        historyId: historyId ?? subscription.historyId,
        lastSyncedAt: new Date(),
    })
    .where(eq(gmailSubscription.id, subscriptionId))
    .catch(() => {});

  const nodes = await getGmailTriggerNodes(subscription.userId);

  if (nodes.length === 0) {
    await stopGmailWatchForUser(subscription.userId);
    return;
  }

  let accessToken: string;
  try {
    accessToken = await ensureGoogleAccessToken(subscription.userId);
  } catch (error) {
    console.error("[Gmail] Unable to refresh access token:", error);
    return;
  }

  for (const node of nodes) {
    try {
      await maybeTriggerWorkflowFromNode({
        node,
        accessToken,
      });
    } catch (error) {
      console.error(
        `[Gmail] Failed to process node ${node.id} for workflow ${node.workflowId}:`,
        error
      );
    }
  }
}

export async function renewGmailSubscriptions() {
  const threshold = new Date(Date.now() + WATCH_RENEWAL_WINDOW_MS);
  const subscriptions = await db.query.gmailSubscription.findMany({
    where: lte(gmailSubscription.expiresAt, threshold),
  });

  for (const subscription of subscriptions) {
    try {
      await ensureGmailWatch({
        userId: subscription.userId,
        labelIds: subscription.labelIds ?? [],
        force: true,
      });
    } catch (error) {
      console.error(
        `[Gmail] Failed to renew watch for user ${subscription.userId}:`,
        error
      );
    }
  }

  return subscriptions.length;
}

async function maybeTriggerWorkflowFromNode({
  node,
  accessToken,
}: {
  node: TriggerNode;
  accessToken: string;
}) {
  const config = ((node.data || {}) as GmailTriggerConfig) || {};
  const variableName = normalizeVariableName(config.variableName);

  const payload = await fetchGmailMessages({
    accessToken,
    config,
  });

  const latestId = payload.messages[0]?.id;

  const state = await db.query.gmailTriggerState.findFirst({
    where: eq(gmailTriggerState.nodeId, node.id),
  });

  if (state?.lastMessageId === latestId) {
    return;
  }

  const initialData: Record<string, unknown> = {
    [variableName]: payload,
  };
  if (variableName !== "gmailTrigger") {
    initialData.gmailTrigger = payload;
  }

  await sendWorkflowExecution({
    workflowId: node.workflowId,
    initialData,
  });

  await db
    .insert(gmailTriggerState)
    .values({
      id: crypto.randomUUID(),
      nodeId: node.id,
      workflowId: node.workflowId,
      lastMessageId: latestId,
      lastTriggeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gmailTriggerState.nodeId,
      set: {
      lastMessageId: latestId,
      lastTriggeredAt: new Date(),
      workflowId: node.workflowId,
      updatedAt: new Date(),
      },
    });
}

async function ensureGmailWatch({
  userId,
  labelIds,
  force = false,
}: {
  userId: string;
  labelIds: string[];
  force?: boolean;
}) {
  const topicName = getGmailTopicName();
  const normalizedLabels = labelIds.length ? labelIds : ["INBOX"];

  const existing = await db.query.gmailSubscription.findFirst({
    where: eq(gmailSubscription.userId, userId),
  });

  const needsRefresh =
    force ||
    !existing ||
    !existing.expiresAt ||
    existing.expiresAt.getTime() - Date.now() < WATCH_RENEWAL_WINDOW_MS ||
    !sameSet(existing.labelIds ?? [], normalizedLabels);

  if (!needsRefresh) {
    if (!sameSet(existing.labelIds ?? [], normalizedLabels)) {
      await db
        .update(gmailSubscription)
        .set({
          labelIds: normalizedLabels,
        })
        .where(eq(gmailSubscription.id, existing.id));
    }
    return;
  }

  const accessToken = await ensureGoogleAccessToken(userId);
  const profile = await fetchGmailProfile(accessToken);
  const emailAddress = profile.emailAddress;
  const payload = await createWatch(accessToken, {
    topicName,
    labelIds: normalizedLabels,
  });

  const expiresAt =
    payload?.expiration !== undefined
      ? new Date(Number(payload.expiration))
      : null;

  await db
    .insert(gmailSubscription)
    .values({
      id: crypto.randomUUID(),
      userId,
      emailAddress,
      labelIds: normalizedLabels,
      topicName,
      historyId: payload?.historyId,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gmailSubscription.userId,
      set: {
      emailAddress,
      labelIds: normalizedLabels,
      topicName,
      historyId: payload?.historyId,
      expiresAt,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
      },
    });
}

async function stopGmailWatchForUser(userId: string) {
  const subscription = await db.query.gmailSubscription.findFirst({
    where: eq(gmailSubscription.userId, userId),
  });

  if (!subscription) {
    return;
  }

  try {
    const accessToken = await ensureGoogleAccessToken(userId);
    await fetch(`${GMAIL_API_BASE}/users/me/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.warn(`[Gmail] Failed to stop watch for user ${userId}:`, error);
  } finally {
    await db
      .delete(gmailSubscription)
      .where(eq(gmailSubscription.id, subscription.id))
      .catch(() => {});
  }
}

async function createWatch(
  accessToken: string,
  {
    topicName,
    labelIds,
  }: {
    topicName: string;
    labelIds: string[];
  }
) {
  const response = await fetch(`${GMAIL_API_BASE}/users/me/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Failed to create Gmail watch channel."
    );
  }

  return payload as { historyId?: string; expiration?: string | number };
}

async function ensureGoogleAccessToken(userId: string) {
  const selectedAccount = await db.query.account.findFirst({
    where: and(eq(accountTable.userId, userId), eq(accountTable.providerId, "google")),
  });

  if (!selectedAccount) {
    throw new Error(
      "Gmail requires a connected Google account. Connect Google under Integrations."
    );
  }

  if (
    selectedAccount.accessToken &&
    selectedAccount.accessTokenExpiresAt &&
    selectedAccount.accessTokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return selectedAccount.accessToken;
  }

  if (!selectedAccount.refreshToken) {
    throw new Error(
      "Gmail access token expired and no refresh token is available. Reconnect Google."
    );
  }

  return refreshGoogleAccessToken(selectedAccount);
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

  const response = await fetch("https://oauth2.googleapis.com/token", {
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
        "Failed to refresh Google access token."
    );
  }

  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000);

  await db
    .update(accountTable)
    .set({
      accessToken: payload.access_token,
      accessTokenExpiresAt: expiresAt,
      refreshToken: payload.refresh_token ?? refreshToken,
      updatedAt: new Date(),
    })
    .where(eq(accountTable.id, account.id));

  return payload.access_token as string;
}

function buildLabelSet(nodes: Array<{ data: unknown }>) {
  const labels = new Set<string>();
  for (const node of nodes) {
    const config = ((node.data || {}) as GmailTriggerConfig) || {};
    const labelId = config.labelId?.trim() || "INBOX";
    labels.add(labelId);
  }
  return Array.from(labels);
}

function normalizeVariableName(value?: string | null) {
  const fallback = "gmailTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  const lookup = new Set(a);
  return b.every((item) => lookup.has(item));
}

function getGmailTopicName() {
  const topic = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topic) {
    throw new Error(
      "Set GMAIL_PUBSUB_TOPIC to the Pub/Sub topic name for Gmail watchers."
    );
  }
  return topic;
}
