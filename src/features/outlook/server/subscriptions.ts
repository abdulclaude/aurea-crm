"use server";

import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  node as workflowNode,
  outlookSubscription,
  outlookTriggerState,
  providerAccount,
  workflows,
} from "@/db/schema";
import {
  buildMicrosoftNotificationId,
  generateMicrosoftClientState,
  hashMicrosoftClientState,
  microsoftClientStateMatches,
  type MicrosoftChangeNotification,
  type MicrosoftSubscriptionScope,
  type MicrosoftSubscriptionSyncInput,
  type MicrosoftVerifiedChangeNotification,
} from "@/features/microsoft/lib/subscription-contracts";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { resolveOutlookTriggerSender } from "@/features/outlook/lib/trigger-config";

const SUBSCRIPTION_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 6;
const SUBSCRIPTION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 3;
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.OUTLOOK_TRIGGER,
);

const outlookTriggerConfigSchema = z
  .object({
    folderName: z.string().optional(),
    subject: z.string().optional(),
    sender: z.string().optional(),
    from: z.string().optional(),
    variableName: z.string().optional(),
  })
  .transform(({ from, ...config }) => ({
    ...config,
    sender: resolveOutlookTriggerSender({ sender: config.sender, from }),
  }));

const outlookMessageSchema = z.object({
  id: z.string().min(1),
  subject: z.string().nullable().optional(),
  from: z
    .object({
      emailAddress: z.object({ address: z.string().optional() }),
    })
    .nullable()
    .optional(),
  receivedDateTime: z.string().optional(),
  bodyPreview: z.string().optional(),
});

const outlookMessagesSchema = z.object({
  value: z.array(outlookMessageSchema).default([]),
});

const outlookProfileSchema = z.object({
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string().min(1),
});

const graphSubscriptionSchema = z.object({
  id: z.string().min(1),
  expirationDateTime: z.string().optional(),
});

const graphErrorSchema = z.object({
  error: z.object({ message: z.string().optional() }).optional(),
});

export type OutlookTriggerConfig = z.infer<typeof outlookTriggerConfigSchema>;

type OutlookNode = Pick<
  InferSelectModel<typeof workflowNode>,
  "id" | "workflowId" | "data" | "providerAccountId"
> & {
  organizationId: string;
  locationId: string | null;
};

type OutlookTriggerScope = Pick<
  MicrosoftSubscriptionScope,
  "organizationId" | "locationId"
> & {
  providerAccountId?: string | null;
};

function exactLocationWhere(locationId: string | null) {
  return locationId !== null
    ? eq(workflows.locationId, locationId)
    : isNull(workflows.locationId);
}

async function getOutlookTriggerNodes(
  scope: OutlookTriggerScope,
): Promise<OutlookNode[]> {
  const rows = await db
    .select({
      id: workflowNode.id,
      workflowId: workflowNode.workflowId,
      data: workflowNode.data,
      providerAccountId: workflowNode.providerAccountId,
      organizationId: workflows.organizationId,
      locationId: workflows.locationId,
    })
    .from(workflowNode)
    .innerJoin(workflows, eq(workflowNode.workflowId, workflows.id))
    .where(
      and(
        eq(workflowNode.type, NodeType.OUTLOOK_TRIGGER),
        eq(workflows.organizationId, scope.organizationId),
        scope.providerAccountId
          ? eq(workflowNode.providerAccountId, scope.providerAccountId)
          : undefined,
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
      ),
    );
  return rows.flatMap((row) =>
    row.organizationId ? [{ ...row, organizationId: row.organizationId }] : [],
  );
}

async function deleteOutlookTriggerStates(
  scope: Pick<MicrosoftSubscriptionScope, "organizationId" | "locationId">,
  exceptNodeIds: string[] = [],
): Promise<void> {
  const rows = await db
    .select({ id: outlookTriggerState.id, nodeId: outlookTriggerState.nodeId })
    .from(outlookTriggerState)
    .innerJoin(workflows, eq(outlookTriggerState.workflowId, workflows.id))
    .where(
      and(
        eq(workflows.organizationId, scope.organizationId),
        exactLocationWhere(scope.locationId),
      ),
    );
  const ids = rows
    .filter((row) => !exceptNodeIds.includes(row.nodeId))
    .map((row) => row.id);
  if (ids.length > 0) {
    await db
      .delete(outlookTriggerState)
      .where(inArray(outlookTriggerState.id, ids));
  }
}

export async function syncOutlookWorkflowSubscriptions(
  input: MicrosoftSubscriptionSyncInput,
): Promise<void> {
  const nodes = await getOutlookTriggerNodes(input);
  await deleteOutlookTriggerStates(
    input,
    nodes.map((node) => node.id),
  );

  const providerAccountIds = Array.from(
    new Set(
      nodes.flatMap((node) =>
        node.providerAccountId ? [node.providerAccountId] : [],
      ),
    ),
  );
  await removeUnusedOutlookWatches(input, new Set(providerAccountIds));
  const accountRows = providerAccountIds.length
    ? await db
        .select({
          id: providerAccount.id,
          locationId: providerAccount.locationId,
        })
        .from(providerAccount)
        .where(
          and(
            eq(providerAccount.organizationId, input.organizationId),
            inArray(providerAccount.id, providerAccountIds),
          ),
        )
    : [];
  const accountLocationById = new Map(
    accountRows.map((account) => [account.id, account.locationId]),
  );

  for (const providerAccountId of providerAccountIds) {
    const boundNode = nodes.find(
      (node) => node.providerAccountId === providerAccountId,
    );
    if (!boundNode || !accountLocationById.has(providerAccountId)) {
      throw new Error(
        "A bound Outlook provider account could not be resolved.",
      );
    }
    const grant = await resolveMicrosoftGrant({
      ...input,
      locationId: boundNode.locationId,
      providerAccountId,
    });
    await ensureOutlookSubscription(
      {
        ...input,
        locationId: accountLocationById.get(providerAccountId) ?? null,
        providerAccountId,
      },
      grant,
    );
  }
}

export async function removeOutlookSubscriptionsForUser(
  input: MicrosoftSubscriptionSyncInput,
): Promise<void> {
  await stopOutlookWatchesForScope(input);
  await deleteOutlookTriggerStates(input);
}

export async function authenticateOutlookNotifications(
  notifications: MicrosoftChangeNotification[],
): Promise<MicrosoftVerifiedChangeNotification[]> {
  const subscriptionIds = Array.from(
    new Set(notifications.map((notification) => notification.subscriptionId)),
  );
  if (subscriptionIds.length === 0) return [];

  const rows = await db
    .select({
      subscriptionId: outlookSubscription.subscriptionId,
      clientStateHash: outlookSubscription.clientStateHash,
    })
    .from(outlookSubscription)
    .where(inArray(outlookSubscription.subscriptionId, subscriptionIds));
  const hashes = new Map(
    rows.flatMap((row) =>
      row.subscriptionId
        ? [[row.subscriptionId, row.clientStateHash] as const]
        : [],
    ),
  );

  return notifications.flatMap(({ clientState, ...notification }) => {
    const expectedHash = hashes.get(notification.subscriptionId);
    return expectedHash &&
      microsoftClientStateMatches(clientState, expectedHash)
      ? [notification]
      : [];
  });
}

export async function enqueueOutlookNotification(
  notification: MicrosoftVerifiedChangeNotification,
): Promise<void> {
  await inngest.send(buildOutlookNotificationEvent(notification));
}

export async function enqueueOutlookNotifications(
  notifications: MicrosoftVerifiedChangeNotification[],
): Promise<void> {
  if (notifications.length === 0) return;
  await inngest.send(notifications.map(buildOutlookNotificationEvent));
}

function buildOutlookNotificationEvent(
  notification: MicrosoftVerifiedChangeNotification,
) {
  return {
    name: "outlook/subscription.notification",
    id: buildMicrosoftNotificationId("outlook", notification),
    data: {
      subscriptionId: notification.subscriptionId,
      changeType: notification.changeType,
      resource: notification.resource,
      resourceData: notification.resourceData,
    },
  } as const;
}

export async function processOutlookNotification(input: {
  subscriptionId: string;
  changeType: string;
  resource: string;
  resourceData?: { id?: string };
}): Promise<void> {
  const subscription = await db.query.outlookSubscription.findFirst({
    where: eq(outlookSubscription.subscriptionId, input.subscriptionId),
  });
  if (!subscription) return;

  const grant = await resolveMicrosoftGrant(subscription);
  const messageId =
    input.resourceData?.id ?? extractMicrosoftResourceId(input.resource);
  if (!messageId) return;
  const nodes = await getOutlookTriggerNodes(subscription);
  if (nodes.length === 0) {
    await stopOutlookWatch(subscription);
    return;
  }

  for (const node of nodes) {
    await maybeTriggerWorkflowFromNode({
      node,
      nodeScope: node,
      grant,
      messageId,
      subscriptionRecordId: subscription.id,
    });
  }

  await db
    .update(outlookSubscription)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(outlookSubscription.id, subscription.id));
}

export async function renewOutlookSubscriptions(): Promise<number> {
  const threshold = new Date(Date.now() + SUBSCRIPTION_RENEWAL_WINDOW_MS);
  const subscriptions = await db.query.outlookSubscription.findMany({
    where: or(
      isNull(outlookSubscription.expiresAt),
      lte(outlookSubscription.expiresAt, threshold),
    ),
  });

  for (const subscription of subscriptions) {
    await ensureOutlookSubscription({ ...subscription, force: true });
  }

  return subscriptions.length;
}

async function maybeTriggerWorkflowFromNode(input: {
  node: OutlookNode;
  nodeScope: Pick<MicrosoftSubscriptionScope, "organizationId" | "locationId">;
  grant: ResolvedMicrosoftGrant;
  messageId: string;
  subscriptionRecordId: string;
}): Promise<void> {
  const config = outlookTriggerConfigSchema.parse(input.node.data ?? {});
  const message = await fetchOutlookMessage(input.grant, input.messageId);
  if (!message) return;
  if (config.subject && !message.subject?.includes(config.subject))
    return;
  if (
    config.sender &&
    !message.from?.emailAddress.address?.includes(config.sender)
  ) {
    return;
  }

  const state = await db.query.outlookTriggerState.findFirst({
    where: eq(outlookTriggerState.nodeId, input.node.id),
  });
  if (state?.lastMessageId === message.id) return;

  const variableName = normalizeVariableName(config.variableName);
  const initialData: Record<string, unknown> = {
    [variableName]: message,
  };
  if (variableName !== "outlookTrigger") {
    initialData.outlookTrigger = message;
  }

  await sendWorkflowExecution({
    workflowId: input.node.workflowId,
    initialData,
    expectedOrganizationId: input.nodeScope.organizationId,
    expectedLocationId: input.nodeScope.locationId,
    idempotencyKey: `microsoft:outlook:${input.subscriptionRecordId}:${input.node.id}:${message.id}`,
  });

  await db
    .insert(outlookTriggerState)
    .values({
      id: crypto.randomUUID(),
      nodeId: input.node.id,
      workflowId: input.node.workflowId,
      lastMessageId: message.id,
      lastTriggeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: outlookTriggerState.nodeId,
      set: {
        lastMessageId: message.id,
        lastTriggeredAt: new Date(),
        workflowId: input.node.workflowId,
        updatedAt: new Date(),
      },
    });
}

async function ensureOutlookSubscription(
  input: MicrosoftSubscriptionScope & { force?: boolean },
  existingGrant?: ResolvedMicrosoftGrant,
): Promise<void> {
  const grant = existingGrant ?? (await resolveMicrosoftGrant(input));
  const { providerAccountId } = grant;
  const existing = await db.query.outlookSubscription.findFirst({
    where: and(
      eq(outlookSubscription.providerAccountId, providerAccountId),
      eq(outlookSubscription.organizationId, input.organizationId),
      input.locationId !== null
        ? eq(outlookSubscription.locationId, input.locationId)
        : isNull(outlookSubscription.locationId),
    ),
  });
  const needsRefresh =
    input.force === true ||
    !existing ||
    !existing.expiresAt ||
    existing.expiresAt.getTime() - Date.now() < SUBSCRIPTION_RENEWAL_WINDOW_MS;
  if (!needsRefresh) return;

  if (existing?.subscriptionId) {
    await deleteSubscription(grant, existing.subscriptionId);
  }

  const clientState = generateMicrosoftClientState();
  const expiresAt = new Date(Date.now() + SUBSCRIPTION_LIFETIME_MS);
  const remote = await createOutlookSubscription(grant, {
    changeType: "created",
    notificationUrl: getOutlookWebhookUrl(),
    resource: "me/mailFolders('Inbox')/messages",
    expirationDateTime: expiresAt.toISOString(),
    clientState,
  });

  try {
    const profile = await fetchOutlookProfile(grant);
    await db
      .insert(outlookSubscription)
      .values({
        id: existing?.id ?? crypto.randomUUID(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        providerAccountId,
        userId: input.userId ?? null,
        emailAddress: profile.mail ?? profile.userPrincipalName,
        subscriptionId: remote.id,
        clientStateHash: hashMicrosoftClientState(clientState),
        expiresAt,
        lastSyncedAt: new Date(),
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: outlookSubscription.providerAccountId,
        set: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          userId: input.userId ?? null,
          emailAddress: profile.mail ?? profile.userPrincipalName,
          subscriptionId: remote.id,
          clientStateHash: hashMicrosoftClientState(clientState),
          expiresAt,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    await deleteSubscription(grant, remote.id).catch(() => undefined);
    throw error;
  }
}

async function stopOutlookWatchesForScope(
  input: MicrosoftSubscriptionSyncInput,
): Promise<void> {
  const subscriptions = await db.query.outlookSubscription.findMany({
    where: and(
      eq(outlookSubscription.organizationId, input.organizationId),
      input.locationId !== null
        ? eq(outlookSubscription.locationId, input.locationId)
        : isNull(outlookSubscription.locationId),
      input.providerAccountId !== null && input.providerAccountId !== undefined
        ? eq(outlookSubscription.providerAccountId, input.providerAccountId)
        : undefined,
    ),
  });
  for (const subscription of subscriptions) {
    await stopOutlookWatch(subscription);
  }
}

async function removeUnusedOutlookWatches(
  input: MicrosoftSubscriptionSyncInput,
  usedProviderAccountIds: ReadonlySet<string>,
): Promise<void> {
  const subscriptions = await db.query.outlookSubscription.findMany({
    where: eq(outlookSubscription.organizationId, input.organizationId),
  });
  for (const subscription of subscriptions) {
    if (!usedProviderAccountIds.has(subscription.providerAccountId)) {
      await stopOutlookWatch(subscription);
    }
  }
}

async function stopOutlookWatch(
  subscription: InferSelectModel<typeof outlookSubscription>,
): Promise<void> {
  try {
    const grant = await resolveMicrosoftGrant(subscription);
    if (subscription.subscriptionId) {
      await deleteSubscription(grant, subscription.subscriptionId);
    }
  } catch {
    console.warn("[Outlook] Failed to remove remote subscription.", {
      providerAccountId: subscription.providerAccountId,
      subscriptionId: subscription.id,
    });
  } finally {
    await db
      .delete(outlookSubscription)
      .where(eq(outlookSubscription.id, subscription.id));
  }
}

async function resolveMicrosoftGrant(input: MicrosoftSubscriptionSyncInput) {
  if (!input.providerAccountId) {
    throw new Error(
      "Outlook subscriptions require an explicit provider account.",
    );
  }
  return resolveOAuthProviderGrant({
    providerAccountId: input.providerAccountId,
    provider: "MICROSOFT_365",
    scope: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
    requiredScopes: providerBinding.requiredScopes,
  });
}

type ResolvedMicrosoftGrant = Awaited<ReturnType<typeof resolveMicrosoftGrant>>;

async function createOutlookSubscription(
  grant: ResolvedMicrosoftGrant,
  input: {
    changeType: string;
    notificationUrl: string;
    resource: string;
    expirationDateTime: string;
    clientState: string;
  },
) {
  const response = await oauthAuthenticatedFetch(grant, `${GRAPH_API_BASE}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${grant.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = graphErrorSchema.safeParse(payload);
    throw new Error(
      error.success
        ? (error.data.error?.message ??
            "Failed to create Outlook subscription.")
        : "Failed to create Outlook subscription.",
    );
  }
  return graphSubscriptionSchema.parse(payload);
}

async function deleteSubscription(
  grant: ResolvedMicrosoftGrant,
  subscriptionId: string,
): Promise<void> {
  const response = await oauthAuthenticatedFetch(
    grant,
    `${GRAPH_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { headers: { Authorization: `Bearer ${grant.accessToken}` }, method: "DELETE" },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete Outlook subscription.");
  }
}

async function fetchOutlookMessage(
  grant: ResolvedMicrosoftGrant,
  messageId: string,
) {
  const response = await oauthAuthenticatedFetch(
    grant,
    `${GRAPH_API_BASE}/me/messages/${encodeURIComponent(messageId)}`,
    { headers: { Authorization: `Bearer ${grant.accessToken}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to fetch Outlook messages.");
  const payload: unknown = await response.json();
  return outlookMessageSchema.parse(payload);
}

function extractMicrosoftResourceId(resource: string): string | null {
  const segment = resource.split("/").filter(Boolean).at(-1);
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

async function fetchOutlookProfile(grant: ResolvedMicrosoftGrant) {
  const response = await oauthAuthenticatedFetch(grant, `${GRAPH_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${grant.accessToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch Outlook profile.");
  const payload: unknown = await response.json();
  return outlookProfileSchema.parse(payload);
}

function normalizeVariableName(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)
    ? trimmed
    : "outlookTrigger";
}

function getOutlookWebhookUrl(): string {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("Set APP_URL or NEXT_PUBLIC_APP_URL for Outlook webhooks.");
  }
  return `${baseUrl}/api/webhooks/outlook`;
}
