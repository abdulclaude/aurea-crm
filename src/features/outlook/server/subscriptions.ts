"use server";

import { and, eq, inArray, lte } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import {
  account as accountTable,
  apps,
  node as workflowNode,
  outlookSubscription,
  outlookTriggerState,
  workflows,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { AppProvider, NodeType } from "@/db/enums";

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
type Account = InferSelectModel<typeof accountTable>;
type OutlookNode = Pick<
  InferSelectModel<typeof workflowNode>,
  "id" | "workflowId" | "data"
>;

async function getOutlookTriggerNodes(userId: string): Promise<OutlookNode[]> {
  return await db
    .select({
      id: workflowNode.id,
      workflowId: workflowNode.workflowId,
      data: workflowNode.data,
    })
    .from(workflowNode)
    .innerJoin(workflows, eq(workflowNode.workflowId, workflows.id))
    .where(
      and(
        eq(workflowNode.type, NodeType.OUTLOOK_TRIGGER),
        eq(workflows.userId, userId),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
      ),
    );
}

async function deleteOutlookTriggerStatesForUser(
  userId: string,
  exceptNodeIds?: string[],
): Promise<void> {
  const rows = await db
    .select({ id: outlookTriggerState.id, nodeId: outlookTriggerState.nodeId })
    .from(outlookTriggerState)
    .innerJoin(workflows, eq(outlookTriggerState.workflowId, workflows.id))
    .where(eq(workflows.userId, userId));
  const ids = rows
    .filter((row) => !exceptNodeIds || !exceptNodeIds.includes(row.nodeId))
    .map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(outlookTriggerState).where(inArray(outlookTriggerState.id, ids));
  }
}

export async function syncOutlookWorkflowSubscriptions({ userId }: SyncParams) {
  try {
    const outlookApp = await db.query.apps.findFirst({
      where: and(eq(apps.userId, userId), eq(apps.provider, AppProvider.MICROSOFT)),
    });

    if (!outlookApp) {
      await stopOutlookWatchForUser(userId);
      await deleteOutlookTriggerStatesForUser(userId);
      return;
    }

    const nodes = await getOutlookTriggerNodes(userId);

    if (nodes.length > 0) {
      const activeNodeIds = nodes.map((node) => node.id);
      await deleteOutlookTriggerStatesForUser(userId, activeNodeIds);
    } else {
      await deleteOutlookTriggerStatesForUser(userId);
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
  await deleteOutlookTriggerStatesForUser(userId);
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
  const subscription = await db.query.outlookSubscription.findFirst({
    where: eq(outlookSubscription.subscriptionId, subscriptionId),
  });

  if (!subscription) {
    return;
  }

  await db
    .update(outlookSubscription)
    .set({
        lastSyncedAt: new Date(),
    })
    .where(eq(outlookSubscription.id, subscription.id))
    .catch(() => {});

  const nodes = await getOutlookTriggerNodes(subscription.userId);

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
  const subscriptions = await db.query.outlookSubscription.findMany({
    where: lte(outlookSubscription.expiresAt, threshold),
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
  node: OutlookNode;
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

  const state = await db.query.outlookTriggerState.findFirst({
    where: eq(outlookTriggerState.nodeId, node.id),
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

  await db
    .insert(outlookTriggerState)
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
      target: outlookTriggerState.nodeId,
      set: {
        lastMessageId: latestId,
        lastTriggeredAt: new Date(),
        workflowId: node.workflowId,
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

  const existing = await db.query.outlookSubscription.findFirst({
    where: eq(outlookSubscription.userId, userId),
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

  await db
    .insert(outlookSubscription)
    .values({
      id: crypto.randomUUID(),
      userId,
      emailAddress: profile.mail || profile.userPrincipalName,
      subscriptionId: subscription.id,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: outlookSubscription.userId,
      set: {
        emailAddress: profile.mail || profile.userPrincipalName,
        subscriptionId: subscription.id,
        expiresAt,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

async function stopOutlookWatchForUser(userId: string) {
  const subscription = await db.query.outlookSubscription.findFirst({
    where: eq(outlookSubscription.userId, userId),
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
    await db
      .delete(outlookSubscription)
      .where(eq(outlookSubscription.id, subscription.id))
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
  const selectedAccount = await db.query.account.findFirst({
    where: and(eq(accountTable.userId, userId), eq(accountTable.providerId, "microsoft")),
  });

  if (!selectedAccount) {
    throw new Error(
      "Outlook requires a connected Microsoft account. Connect Microsoft 365 under Apps."
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
      "Outlook access token expired and no refresh token is available. Reconnect Microsoft 365."
    );
  }

  return refreshMicrosoftAccessToken(selectedAccount);
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
