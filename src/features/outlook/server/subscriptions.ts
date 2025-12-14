"use server";

import prisma from "@/lib/db";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { AppProvider, NodeType } from "@prisma/client";
import type { Account, Node as PrismaNode } from "@prisma/client";

const SUBSCRIPTION_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 6; // 6 hours
const SUBSCRIPTION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 3; // 3 days (max allowed by Microsoft)
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export type OutlookTriggerConfig = {
  folderName?: string;
  subject?: string;
  sender?: string;
  variableName?: string;
};

type SyncParams = {
  userId: string;
};

export async function syncOutlookWorkflowSubscriptions({ userId }: SyncParams) {
  try {
    const outlookApp = await prisma.apps.findFirst({
      where: {
        userId,
        provider: AppProvider.MICROSOFT,
      },
    });

    if (!outlookApp) {
      await stopOutlookWatchForUser(userId);
      await prisma.outlookTriggerState.deleteMany({
        where: { Workflows: { userId } },
      });
      return;
    }

    const nodes = await prisma.node.findMany({
      where: {
        type: NodeType.OUTLOOK_TRIGGER,
        Workflows: {
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
      await prisma.outlookTriggerState.deleteMany({
        where: {
          Workflows: { userId },
          nodeId: { notIn: activeNodeIds },
        },
      });
    } else {
      await prisma.outlookTriggerState.deleteMany({
        where: { Workflows: { userId } },
      });
    }

    if (nodes.length === 0) {
      await stopOutlookWatchForUser(userId);
      return;
    }

    await ensureOutlookSubscription({ userId });
  } catch (error) {
    console.error(
      `[Outlook] Failed to sync workflow subscriptions for user ${userId}:`,
      error
    );
  }
}

export async function removeOutlookSubscriptionsForUser(userId: string) {
  await stopOutlookWatchForUser(userId);
  await prisma.outlookTriggerState.deleteMany({
    where: { Workflows: { userId } },
  });
}

export async function enqueueOutlookNotification({
  subscriptionId,
  changeType,
  resource,
}: {
  subscriptionId: string;
  changeType: string;
  resource: string;
}) {
  await inngest.send({
    name: "outlook/subscription.notification",
    data: {
      subscriptionId,
      changeType,
      resource,
    },
  });
}

export async function processOutlookNotification({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const subscription = await prisma.outlookSubscription.findFirst({
    where: { subscriptionId },
  });

  if (!subscription) {
    return;
  }

  await prisma.outlookSubscription
    .update({
      where: { id: subscription.id },
      data: {
        lastSyncedAt: new Date(),
      },
    })
    .catch(() => {});

  const nodes = await prisma.node.findMany({
    where: {
      type: NodeType.OUTLOOK_TRIGGER,
      Workflows: {
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

  if (nodes.length === 0) {
    await stopOutlookWatchForUser(subscription.userId);
    return;
  }

  let accessToken: string;
  try {
    accessToken = await ensureMicrosoftAccessToken(subscription.userId);
  } catch (error) {
    console.error("[Outlook] Unable to refresh access token:", error);
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
        `[Outlook] Failed to process node ${node.id} for workflow ${node.workflowId}:`,
        error
      );
    }
  }
}

export async function renewOutlookSubscriptions() {
  const threshold = new Date(Date.now() + SUBSCRIPTION_RENEWAL_WINDOW_MS);
  const subscriptions = await prisma.outlookSubscription.findMany({
    where: {
      expiresAt: {
        lte: threshold,
      },
    },
  });

  for (const subscription of subscriptions) {
    try {
      await ensureOutlookSubscription({
        userId: subscription.userId,
        force: true,
      });
    } catch (error) {
      console.error(
        `[Outlook] Failed to renew subscription for user ${subscription.userId}:`,
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
  const config = ((node.data || {}) as OutlookTriggerConfig) || {};
  const variableName = normalizeVariableName(config.variableName);

  // Fetch latest message
  const folder = config.folderName || "Inbox";
  const messages = await fetchOutlookMessages({
    accessToken,
    folder,
    top: 1,
  });

  if (!messages || messages.length === 0) {
    return;
  }

  const latestMessage = messages[0];
  const latestId = latestMessage.id;

  // Check if this message matches filters
  if (config.subject && !latestMessage.subject?.includes(config.subject)) {
    return;
  }

  if (
    config.sender &&
    !latestMessage.from?.emailAddress?.address?.includes(config.sender)
  ) {
    return;
  }

  const state = await prisma.outlookTriggerState.findUnique({
    where: { nodeId: node.id },
  });

  if (state?.lastMessageId === latestId) {
    return;
  }

  const initialData: Record<string, unknown> = {
    [variableName]: latestMessage,
  };
  if (variableName !== "outlookTrigger") {
    initialData.outlookTrigger = latestMessage;
  }

  await sendWorkflowExecution({
    workflowId: node.workflowId,
    initialData,
  });

  await prisma.outlookTriggerState.upsert({
    where: { nodeId: node.id },
    update: {
      lastMessageId: latestId,
      lastTriggeredAt: new Date(),
      workflowId: node.workflowId,
    },
    create: {
      id: crypto.randomUUID(),
      nodeId: node.id,
      workflowId: node.workflowId,
      lastMessageId: latestId,
      lastTriggeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function ensureOutlookSubscription({
  userId,
  force = false,
}: {
  userId: string;
  force?: boolean;
}) {
  const webhookUrl = getOutlookWebhookUrl();

  const existing = await prisma.outlookSubscription.findUnique({
    where: { userId },
  });

  const needsRefresh =
    force ||
    !existing ||
    !existing.expiresAt ||
    existing.expiresAt.getTime() - Date.now() < SUBSCRIPTION_RENEWAL_WINDOW_MS;

  if (!needsRefresh) {
    return;
  }

  const accessToken = await ensureMicrosoftAccessToken(userId);

  // Delete old subscription if exists
  if (existing?.subscriptionId) {
    await deleteSubscription(accessToken, existing.subscriptionId).catch(
      () => {}
    );
  }

  // Create new subscription
  const expiresAt = new Date(Date.now() + SUBSCRIPTION_LIFETIME_MS);
  const subscription = await createOutlookSubscription(accessToken, {
    changeType: "created",
    notificationUrl: webhookUrl,
    resource: "me/mailFolders('Inbox')/messages",
    expirationDateTime: expiresAt.toISOString(),
  });

  const profile = await fetchOutlookProfile(accessToken);

  await prisma.outlookSubscription.upsert({
    where: { userId },
    update: {
      emailAddress: profile.mail || profile.userPrincipalName,
      subscriptionId: subscription.id,
      expiresAt,
      lastSyncedAt: new Date(),
    },
    create: {
      id: crypto.randomUUID(),
      userId,
      emailAddress: profile.mail || profile.userPrincipalName,
      subscriptionId: subscription.id,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function stopOutlookWatchForUser(userId: string) {
  const subscription = await prisma.outlookSubscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return;
  }

  try {
    const accessToken = await ensureMicrosoftAccessToken(userId);
    if (subscription.subscriptionId) {
      await deleteSubscription(accessToken, subscription.subscriptionId);
    }
  } catch (error) {
    console.warn(
      `[Outlook] Failed to stop subscription for user ${userId}:`,
      error
    );
  } finally {
    await prisma.outlookSubscription
      .delete({
        where: { id: subscription.id },
      })
      .catch(() => {});
  }
}

async function createOutlookSubscription(
  accessToken: string,
  {
    changeType,
    notificationUrl,
    resource,
    expirationDateTime,
  }: {
    changeType: string;
    notificationUrl: string;
    resource: string;
    expirationDateTime: string;
  }
) {
  const response = await fetch(`${GRAPH_API_BASE}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType,
      notificationUrl,
      resource,
      expirationDateTime,
      clientState: "aurea-crm-outlook-webhook",
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Failed to create Outlook subscription."
    );
  }

  return payload as { id: string; expirationDateTime: string };
}

async function deleteSubscription(accessToken: string, subscriptionId: string) {
  const response = await fetch(
    `${GRAPH_API_BASE}/subscriptions/${subscriptionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete Outlook subscription.");
  }
}

async function fetchOutlookMessages({
  accessToken,
  folder,
  top = 10,
}: {
  accessToken: string;
  folder: string;
  top?: number;
}) {
  const response = await fetch(
    `${GRAPH_API_BASE}/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Outlook messages.");
  }

  const data = await response.json();
  return data.value as Array<{
    id: string;
    subject: string;
    from: { emailAddress: { address: string } };
    receivedDateTime: string;
    bodyPreview: string;
  }>;
}

async function fetchOutlookProfile(accessToken: string) {
  const response = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Outlook profile.");
  }

  const data = await response.json();
  return data as { mail: string; userPrincipalName: string };
}

export async function ensureMicrosoftAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "microsoft",
    },
  });

  if (!account) {
    throw new Error(
      "Outlook requires a connected Microsoft account. Connect Microsoft 365 under Apps."
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
      "Outlook access token expired and no refresh token is available. Reconnect Microsoft 365."
    );
  }

  return refreshMicrosoftAccessToken(account);
}

async function refreshMicrosoftAccessToken(account: Account) {
  const refreshToken = account.refreshToken;
  if (!refreshToken) {
    throw new Error("Microsoft account is missing a refresh token.");
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials are not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope:
      "openid email profile offline_access Mail.ReadWrite Mail.Send Files.ReadWrite.All",
  });

  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to refresh Microsoft access token."
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

function normalizeVariableName(value?: string | null) {
  const fallback = "outlookTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function getOutlookWebhookUrl() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("Set APP_URL or NEXT_PUBLIC_APP_URL for Outlook webhooks.");
  }
  return `${baseUrl}/api/webhooks/outlook`;
}
