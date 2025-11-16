"use server";

import prisma from "@/lib/db";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { IntegrationProvider, NodeType } from "@/generated/prisma/enums";
import type {
  Account,
  Node as PrismaNode,
  GmailSubscription as PrismaGmailSubscription,
} from "@/generated/prisma/client";
import { fetchGmailMessages, type GmailTriggerConfig } from "./messages";
import { fetchGmailProfile } from "./profile";

const WATCH_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 6; // 6 hours
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

type SyncParams = {
  userId: string;
};

export async function syncGmailWorkflowSubscriptions({ userId }: SyncParams) {
  try {
    const gmailIntegration = await prisma.integration.findFirst({
      where: {
        userId,
        provider: IntegrationProvider.GMAIL,
      },
    });

    if (!gmailIntegration) {
      await stopGmailWatchForUser(userId);
      await prisma.gmailTriggerState.deleteMany({
        where: { workflow: { userId } },
      });
      return;
    }

    const nodes = await prisma.node.findMany({
      where: {
        type: NodeType.GMAIL_TRIGGER,
        workflow: {
          userId,
          archived: false,
          isTemplate: false,
        },
      },
      select: {
        id: true,
        workflowId: true,
        data: true,
      },
    });

    if (nodes.length > 0) {
      const activeNodeIds = nodes.map((node) => node.id);
      await prisma.gmailTriggerState.deleteMany({
        where: {
          workflow: { userId },
          nodeId: { notIn: activeNodeIds },
        },
      });
    } else {
      await prisma.gmailTriggerState.deleteMany({
        where: { workflow: { userId } },
      });
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
  await prisma.gmailTriggerState.deleteMany({
    where: { workflow: { userId } },
  });
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
  const subscription = await prisma.gmailSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return;
  }

  await prisma.gmailSubscription
    .update({
      where: { id: subscriptionId },
      data: {
        historyId: historyId ?? subscription.historyId,
        lastSyncedAt: new Date(),
      },
    })
    .catch(() => {});

  const nodes = await prisma.node.findMany({
    where: {
      type: NodeType.GMAIL_TRIGGER,
      workflow: {
        userId: subscription.userId,
        archived: false,
        isTemplate: false,
      },
    },
    select: {
      id: true,
      workflowId: true,
      data: true,
    },
  });

  console.log(
    "[Gmail] Nodes eligible for trigger",
    subscriptionId,
    nodes.map((node) => ({
      id: node.id,
      workflowId: node.workflowId,
    }))
  );

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
  const subscriptions = await prisma.gmailSubscription.findMany({
    where: {
      expiresAt: {
        lte: threshold,
      },
    },
  });

  for (const subscription of subscriptions) {
    try {
      await ensureGmailWatch({
        userId: subscription.userId,
        labelIds: subscription.labelIds,
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
  node: Pick<PrismaNode, "id" | "workflowId" | "data">;
  accessToken: string;
}) {
  const config = ((node.data || {}) as GmailTriggerConfig) || {};
  const variableName = normalizeVariableName(config.variableName);

  const payload = await fetchGmailMessages({
    accessToken,
    config,
  });

  const latestId = payload.messages[0]?.id;
  console.log(
    "[Gmail] Latest message for node",
    node.id,
    "latestId:",
    latestId,
    "messageCount:",
    payload.messages.length
  );
  if (!latestId) {
    return;
  }

  const state = await prisma.gmailTriggerState.findUnique({
    where: { nodeId: node.id },
  });

  if (state) {
    console.log(
      "[Gmail] Last seen message for node",
      node.id,
      "is",
      state.lastMessageId
    );
  }

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

  await prisma.gmailTriggerState.upsert({
    where: { nodeId: node.id },
    update: {
      lastMessageId: latestId,
      lastTriggeredAt: new Date(),
      workflowId: node.workflowId,
    },
    create: {
      nodeId: node.id,
      workflowId: node.workflowId,
      lastMessageId: latestId,
      lastTriggeredAt: new Date(),
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

  const existing = await prisma.gmailSubscription.findUnique({
    where: { userId },
  });

  const needsRefresh =
    force ||
    !existing ||
    !existing.expiresAt ||
    existing.expiresAt.getTime() - Date.now() < WATCH_RENEWAL_WINDOW_MS ||
    !sameSet(existing.labelIds, normalizedLabels);

  if (!needsRefresh) {
    if (!sameSet(existing.labelIds, normalizedLabels)) {
      await prisma.gmailSubscription.update({
        where: { id: existing.id },
        data: {
          labelIds: normalizedLabels,
        },
      });
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

  await prisma.gmailSubscription.upsert({
    where: { userId },
    update: {
      emailAddress,
      labelIds: normalizedLabels,
      topicName,
      historyId: payload?.historyId,
      expiresAt,
      lastSyncedAt: new Date(),
    },
    create: {
      userId,
      emailAddress,
      labelIds: normalizedLabels,
      topicName,
      historyId: payload?.historyId,
      expiresAt,
    },
  });
}

async function stopGmailWatchForUser(userId: string) {
  const subscription = await prisma.gmailSubscription.findUnique({
    where: { userId },
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
    await prisma.gmailSubscription
      .delete({
        where: { id: subscription.id },
      })
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
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "google",
    },
  });

  if (!account) {
    throw new Error(
      "Gmail requires a connected Google account. Connect Google under Integrations."
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
      "Gmail access token expired and no refresh token is available. Reconnect Google."
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

function buildLabelSet(nodes: Array<{ data: PrismaNode["data"] }>) {
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
