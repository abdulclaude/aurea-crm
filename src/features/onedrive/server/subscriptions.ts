"use server";

import prisma from "@/lib/db";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { AppProvider, NodeType } from "@prisma/client";
import type { Node as PrismaNode } from "@prisma/client";
import { ensureMicrosoftAccessToken } from "@/features/outlook/server/subscriptions";

const SUBSCRIPTION_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 6; // 6 hours
const SUBSCRIPTION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 3; // 3 days (max allowed by Microsoft)
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export type OneDriveTriggerConfig = {
  folderPath?: string;
  filePattern?: string;
  changeType?: "created" | "updated" | "deleted";
  variableName?: string;
};

type SyncParams = {
  userId: string;
};

export async function syncOneDriveWorkflowSubscriptions({
  userId,
}: SyncParams) {
  try {
    const oneDriveApp = await prisma.apps.findFirst({
      where: {
        userId,
        provider: AppProvider.MICROSOFT,
      },
    });

    if (!oneDriveApp) {
      await stopOneDriveWatchForUser(userId);
      await prisma.oneDriveTriggerState.deleteMany({
        where: { Workflows: { userId } },
      });
      return;
    }

    const nodes = await prisma.node.findMany({
      where: {
        type: NodeType.ONEDRIVE_TRIGGER,
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
      await prisma.oneDriveTriggerState.deleteMany({
        where: {
          Workflows: { userId },
          nodeId: { notIn: activeNodeIds },
        },
      });
    } else {
      await prisma.oneDriveTriggerState.deleteMany({
        where: { Workflows: { userId } },
      });
    }

    if (nodes.length === 0) {
      await stopOneDriveWatchForUser(userId);
      return;
    }

    await ensureOneDriveSubscription({ userId });
  } catch (error) {
    console.error(
      `[OneDrive] Failed to sync workflow subscriptions for user ${userId}:`,
      error
    );
  }
}

export async function removeOneDriveSubscriptionsForUser(userId: string) {
  await stopOneDriveWatchForUser(userId);
  await prisma.oneDriveTriggerState.deleteMany({
    where: { Workflows: { userId } },
  });
}

export async function enqueueOneDriveNotification({
  subscriptionId,
  changeType,
  resource,
}: {
  subscriptionId: string;
  changeType: string;
  resource: string;
}) {
  await inngest.send({
    name: "onedrive/subscription.notification",
    data: {
      subscriptionId,
      changeType,
      resource,
    },
  });
}

export async function processOneDriveNotification({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const subscription = await prisma.oneDriveSubscription.findFirst({
    where: { subscriptionId },
  });

  if (!subscription) {
    return;
  }

  await prisma.oneDriveSubscription
    .update({
      where: { id: subscription.id },
      data: {
        lastSyncedAt: new Date(),
      },
    })
    .catch(() => {});

  const nodes = await prisma.node.findMany({
    where: {
      type: NodeType.ONEDRIVE_TRIGGER,
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
    await stopOneDriveWatchForUser(subscription.userId);
    return;
  }

  let accessToken: string;
  try {
    accessToken = await ensureMicrosoftAccessToken(subscription.userId);
  } catch (error) {
    console.error("[OneDrive] Unable to refresh access token:", error);
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
        `[OneDrive] Failed to process node ${node.id} for workflow ${node.workflowId}:`,
        error
      );
    }
  }
}

export async function renewOneDriveSubscriptions() {
  const threshold = new Date(Date.now() + SUBSCRIPTION_RENEWAL_WINDOW_MS);
  const subscriptions = await prisma.oneDriveSubscription.findMany({
    where: {
      expiresAt: {
        lte: threshold,
      },
    },
  });

  for (const subscription of subscriptions) {
    try {
      await ensureOneDriveSubscription({
        userId: subscription.userId,
        force: true,
      });
    } catch (error) {
      console.error(
        `[OneDrive] Failed to renew subscription for user ${subscription.userId}:`,
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
  const config = ((node.data || {}) as OneDriveTriggerConfig) || {};
  const variableName = normalizeVariableName(config.variableName);

  // Fetch recent changes in the drive
  const changes = await fetchOneDriveChanges({
    accessToken,
    folderPath: config.folderPath,
  });

  if (!changes || changes.length === 0) {
    return;
  }

  const latestChange = changes[0];
  const latestId = latestChange.id;

  // Check if this change matches filters
  if (config.filePattern && !latestChange.name?.includes(config.filePattern)) {
    return;
  }

  const state = await prisma.oneDriveTriggerState.findUnique({
    where: { nodeId: node.id },
  });

  if (state?.lastDeltaLink === latestId) {
    return;
  }

  const initialData: Record<string, unknown> = {
    [variableName]: latestChange,
  };
  if (variableName !== "oneDriveTrigger") {
    initialData.oneDriveTrigger = latestChange;
  }

  await sendWorkflowExecution({
    workflowId: node.workflowId,
    initialData,
  });

  await prisma.oneDriveTriggerState.upsert({
    where: { nodeId: node.id },
    update: {
      lastDeltaLink: latestId,
      lastTriggeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      workflowId: node.workflowId,
    },
    create: {
        id: crypto.randomUUID(),
      nodeId: node.id,
      workflowId: node.workflowId,
      lastDeltaLink: latestId,
      lastTriggeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function ensureOneDriveSubscription({
  userId,
  force = false,
}: {
  userId: string;
  force?: boolean;
}) {
  const webhookUrl = getOneDriveWebhookUrl();

  const existing = await prisma.oneDriveSubscription.findUnique({
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
  const subscription = await createOneDriveSubscription(accessToken, {
    changeType: "updated",
    notificationUrl: webhookUrl,
    resource: "me/drive/root",
    expirationDateTime: expiresAt.toISOString(),
  });

  await prisma.oneDriveSubscription.upsert({
    where: { userId },
    update: {
      subscriptionId: subscription.id,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncedAt: new Date(),
    },
    create: {
        id: crypto.randomUUID(),
      userId,
      subscriptionId: subscription.id,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function stopOneDriveWatchForUser(userId: string) {
  const subscription = await prisma.oneDriveSubscription.findUnique({
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
      `[OneDrive] Failed to stop subscription for user ${userId}:`,
      error
    );
  } finally {
    await prisma.oneDriveSubscription
      .delete({
        where: { id: subscription.id },
      })
      .catch(() => {});
  }
}

async function createOneDriveSubscription(
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
      clientState: "aurea-crm-onedrive-webhook",
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Failed to create OneDrive subscription."
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
    throw new Error("Failed to delete OneDrive subscription.");
  }
}

async function fetchOneDriveChanges({
  accessToken,
  folderPath,
}: {
  accessToken: string;
  folderPath?: string;
}) {
  const resource = folderPath
    ? `me/drive/root:${folderPath}:/children`
    : "me/drive/root/children";

  const response = await fetch(
    `${GRAPH_API_BASE}/${resource}?$orderby=lastModifiedDateTime desc&$top=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch OneDrive changes.");
  }

  const data = await response.json();
  return data.value as Array<{
    id: string;
    name: string;
    lastModifiedDateTime: string;
    size: number;
    webUrl: string;
  }>;
}

function normalizeVariableName(value?: string | null) {
  const fallback = "oneDriveTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function getOneDriveWebhookUrl() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error(
      "Set APP_URL or NEXT_PUBLIC_APP_URL for OneDrive webhooks."
    );
  }
  return `${baseUrl}/api/webhooks/onedrive`;
}
