"use server";

import { and, eq, inArray, lte } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import { db } from "@/db";
import {
  apps,
  node as workflowNode,
  oneDriveSubscription,
  oneDriveTriggerState,
  workflows,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { AppProvider, NodeType } from "@/db/enums";
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
type OneDriveNode = Pick<
  InferSelectModel<typeof workflowNode>,
  "id" | "workflowId" | "data"
>;

async function getOneDriveTriggerNodes(userId: string): Promise<OneDriveNode[]> {
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
        eq(workflowNode.type, NodeType.ONEDRIVE_TRIGGER),
        eq(workflows.userId, userId),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
      ),
    );
}

async function deleteOneDriveTriggerStatesForUser(
  userId: string,
  exceptNodeIds?: string[],
): Promise<void> {
  const rows = await db
    .select({ id: oneDriveTriggerState.id, nodeId: oneDriveTriggerState.nodeId })
    .from(oneDriveTriggerState)
    .innerJoin(workflows, eq(oneDriveTriggerState.workflowId, workflows.id))
    .where(eq(workflows.userId, userId));
  const ids = rows
    .filter((row) => !exceptNodeIds || !exceptNodeIds.includes(row.nodeId))
    .map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(oneDriveTriggerState).where(inArray(oneDriveTriggerState.id, ids));
  }
}

export async function syncOneDriveWorkflowSubscriptions({
  userId,
}: SyncParams) {
  try {
    const oneDriveApp = await db.query.apps.findFirst({
      where: and(eq(apps.userId, userId), eq(apps.provider, AppProvider.MICROSOFT)),
    });

    if (!oneDriveApp) {
      await stopOneDriveWatchForUser(userId);
      await deleteOneDriveTriggerStatesForUser(userId);
      return;
    }

    const nodes = await getOneDriveTriggerNodes(userId);

    if (nodes.length > 0) {
      const activeNodeIds = nodes.map((node) => node.id);
      await deleteOneDriveTriggerStatesForUser(userId, activeNodeIds);
    } else {
      await deleteOneDriveTriggerStatesForUser(userId);
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
  await deleteOneDriveTriggerStatesForUser(userId);
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
  const subscription = await db.query.oneDriveSubscription.findFirst({
    where: eq(oneDriveSubscription.subscriptionId, subscriptionId),
  });

  if (!subscription) {
    return;
  }

  await db
    .update(oneDriveSubscription)
    .set({
        lastSyncedAt: new Date(),
    })
    .where(eq(oneDriveSubscription.id, subscription.id))
    .catch(() => {});

  const nodes = await getOneDriveTriggerNodes(subscription.userId);

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
  const subscriptions = await db.query.oneDriveSubscription.findMany({
    where: lte(oneDriveSubscription.expiresAt, threshold),
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
  node: OneDriveNode;
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

  const state = await db.query.oneDriveTriggerState.findFirst({
    where: eq(oneDriveTriggerState.nodeId, node.id),
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

  await db
    .insert(oneDriveTriggerState)
    .values({
      id: crypto.randomUUID(),
      nodeId: node.id,
      workflowId: node.workflowId,
      lastDeltaLink: latestId,
      lastTriggeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: oneDriveTriggerState.nodeId,
      set: {
        lastDeltaLink: latestId,
        lastTriggeredAt: new Date(),
        updatedAt: new Date(),
        workflowId: node.workflowId,
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

  const existing = await db.query.oneDriveSubscription.findFirst({
    where: eq(oneDriveSubscription.userId, userId),
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

  await db
    .insert(oneDriveSubscription)
    .values({
      id: crypto.randomUUID(),
      userId,
      subscriptionId: subscription.id,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: oneDriveSubscription.userId,
      set: {
        subscriptionId: subscription.id,
        expiresAt,
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });
}

async function stopOneDriveWatchForUser(userId: string) {
  const subscription = await db.query.oneDriveSubscription.findFirst({
    where: eq(oneDriveSubscription.userId, userId),
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
    await db
      .delete(oneDriveSubscription)
      .where(eq(oneDriveSubscription.id, subscription.id))
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
