"use server";

import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  node as workflowNode,
  oneDriveSubscription,
  oneDriveTriggerState,
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

const SUBSCRIPTION_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 6;
const SUBSCRIPTION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 3;
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.ONEDRIVE_TRIGGER,
);

const oneDriveTriggerConfigSchema = z.object({
  folderPath: z.string().optional(),
  filePattern: z.string().optional(),
  changeType: z.enum(["created", "updated", "deleted"]).optional(),
  variableName: z.string().optional(),
});

const oneDriveItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  size: z.number().optional(),
  webUrl: z.string().optional(),
  eTag: z.string().optional(),
  deleted: z.object({ state: z.string().optional() }).optional(),
  parentReference: z.object({ path: z.string().optional() }).optional(),
});

const oneDriveDeltaSchema = z.object({
  value: z.array(oneDriveItemSchema).default([]),
  "@odata.nextLink": z.string().url().optional(),
  "@odata.deltaLink": z.string().url().optional(),
});

const graphSubscriptionSchema = z.object({
  id: z.string().min(1),
  expirationDateTime: z.string().optional(),
});

const graphErrorSchema = z.object({
  error: z.object({ message: z.string().optional() }).optional(),
});

export type OneDriveTriggerConfig = z.infer<typeof oneDriveTriggerConfigSchema>;

type OneDriveNode = Pick<
  InferSelectModel<typeof workflowNode>,
  "id" | "workflowId" | "data" | "providerAccountId"
> & {
  organizationId: string;
  locationId: string | null;
};

type OneDriveTriggerScope = Pick<
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

async function getOneDriveTriggerNodes(
  scope: OneDriveTriggerScope,
): Promise<OneDriveNode[]> {
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
        eq(workflowNode.type, NodeType.ONEDRIVE_TRIGGER),
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

async function deleteOneDriveTriggerStates(
  scope: Pick<MicrosoftSubscriptionScope, "organizationId" | "locationId">,
  exceptNodeIds: string[] = [],
): Promise<void> {
  const rows = await db
    .select({
      id: oneDriveTriggerState.id,
      nodeId: oneDriveTriggerState.nodeId,
    })
    .from(oneDriveTriggerState)
    .innerJoin(workflows, eq(oneDriveTriggerState.workflowId, workflows.id))
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
      .delete(oneDriveTriggerState)
      .where(inArray(oneDriveTriggerState.id, ids));
  }
}

export async function syncOneDriveWorkflowSubscriptions(
  input: MicrosoftSubscriptionSyncInput,
): Promise<void> {
  const nodes = await getOneDriveTriggerNodes(input);
  await deleteOneDriveTriggerStates(
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
  await removeUnusedOneDriveWatches(input, new Set(providerAccountIds));
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
        "A bound OneDrive provider account could not be resolved.",
      );
    }
    const grant = await resolveMicrosoftGrant({
      ...input,
      locationId: boundNode.locationId,
      providerAccountId,
    });
    await initializeOneDriveTriggerStates(
      grant,
      nodes.filter((node) => node.providerAccountId === providerAccountId),
    );
    await ensureOneDriveSubscription(
      {
        ...input,
        locationId: accountLocationById.get(providerAccountId) ?? null,
        providerAccountId,
      },
      grant,
    );
  }
}

export async function removeOneDriveSubscriptionsForUser(
  input: MicrosoftSubscriptionSyncInput,
): Promise<void> {
  await stopOneDriveWatchesForScope(input);
  await deleteOneDriveTriggerStates(input);
}

export async function authenticateOneDriveNotifications(
  notifications: MicrosoftChangeNotification[],
): Promise<MicrosoftVerifiedChangeNotification[]> {
  const subscriptionIds = Array.from(
    new Set(notifications.map((notification) => notification.subscriptionId)),
  );
  if (subscriptionIds.length === 0) return [];

  const rows = await db
    .select({
      subscriptionId: oneDriveSubscription.subscriptionId,
      clientStateHash: oneDriveSubscription.clientStateHash,
    })
    .from(oneDriveSubscription)
    .where(inArray(oneDriveSubscription.subscriptionId, subscriptionIds));
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

export async function enqueueOneDriveNotification(
  notification: MicrosoftVerifiedChangeNotification,
): Promise<void> {
  await inngest.send(buildOneDriveNotificationEvent(notification));
}

export async function enqueueOneDriveNotifications(
  notifications: MicrosoftVerifiedChangeNotification[],
): Promise<void> {
  if (notifications.length === 0) return;
  await inngest.send(notifications.map(buildOneDriveNotificationEvent));
}

function buildOneDriveNotificationEvent(
  notification: MicrosoftVerifiedChangeNotification,
) {
  return {
    name: "onedrive/subscription.notification",
    id: buildMicrosoftNotificationId("onedrive", notification),
    data: {
      subscriptionId: notification.subscriptionId,
      changeType: notification.changeType,
      resource: notification.resource,
    },
  } as const;
}

export async function processOneDriveNotification(input: {
  subscriptionId: string;
  changeType: string;
  resource: string;
}): Promise<void> {
  const subscription = await db.query.oneDriveSubscription.findFirst({
    where: eq(oneDriveSubscription.subscriptionId, input.subscriptionId),
  });
  if (!subscription) return;

  const grant = await resolveMicrosoftGrant(subscription);
  const nodes = await getOneDriveTriggerNodes(subscription);
  if (nodes.length === 0) {
    await stopOneDriveWatch(subscription);
    return;
  }

  for (const node of nodes) {
    await maybeTriggerWorkflowFromNode({
      node,
      nodeScope: node,
      grant,
      subscriptionRecordId: subscription.id,
    });
  }

  await db
    .update(oneDriveSubscription)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(oneDriveSubscription.id, subscription.id));
}

export async function renewOneDriveSubscriptions(): Promise<number> {
  const threshold = new Date(Date.now() + SUBSCRIPTION_RENEWAL_WINDOW_MS);
  const subscriptions = await db.query.oneDriveSubscription.findMany({
    where: or(
      isNull(oneDriveSubscription.expiresAt),
      lte(oneDriveSubscription.expiresAt, threshold),
    ),
  });

  for (const subscription of subscriptions) {
    await ensureOneDriveSubscription({ ...subscription, force: true });
  }

  return subscriptions.length;
}

async function maybeTriggerWorkflowFromNode(input: {
  node: OneDriveNode;
  nodeScope: Pick<MicrosoftSubscriptionScope, "organizationId" | "locationId">;
  grant: ResolvedMicrosoftGrant;
  subscriptionRecordId: string;
}): Promise<void> {
  const config = oneDriveTriggerConfigSchema.parse(input.node.data ?? {});
  const state = await db.query.oneDriveTriggerState.findFirst({
    where: eq(oneDriveTriggerState.nodeId, input.node.id),
  });
  if (!state?.lastDeltaLink) {
    await initializeOneDriveTriggerStates(input.grant, [input.node]);
    return;
  }
  const delta = await fetchOneDriveDelta(input.grant, state.lastDeltaLink);

  const variableName = normalizeVariableName(config.variableName);
  for (const change of delta.items) {
    if (!oneDriveChangeMatchesConfig(change, config)) continue;
    const initialData: Record<string, unknown> = { [variableName]: change };
    if (variableName !== "oneDriveTrigger") initialData.oneDriveTrigger = change;
    await sendWorkflowExecution({
      workflowId: input.node.workflowId,
      initialData,
      expectedOrganizationId: input.nodeScope.organizationId,
      expectedLocationId: input.nodeScope.locationId,
      idempotencyKey: `microsoft:onedrive:${input.subscriptionRecordId}:${input.node.id}:${change.id}:${change.eTag ?? change.lastModifiedDateTime ?? (change.deleted ? "deleted" : "changed")}`,
    });
  }

  await db
    .update(oneDriveTriggerState)
    .set({
      lastDeltaLink: delta.deltaLink,
      lastTriggeredAt: delta.items.length > 0 ? new Date() : state.lastTriggeredAt,
      workflowId: input.node.workflowId,
      updatedAt: new Date(),
    })
    .where(eq(oneDriveTriggerState.nodeId, input.node.id));
}

async function ensureOneDriveSubscription(
  input: MicrosoftSubscriptionScope & { force?: boolean },
  existingGrant?: ResolvedMicrosoftGrant,
): Promise<void> {
  const grant = existingGrant ?? (await resolveMicrosoftGrant(input));
  const { providerAccountId } = grant;
  const existing = await db.query.oneDriveSubscription.findFirst({
    where: and(
      eq(oneDriveSubscription.providerAccountId, providerAccountId),
      eq(oneDriveSubscription.organizationId, input.organizationId),
      input.locationId !== null
        ? eq(oneDriveSubscription.locationId, input.locationId)
        : isNull(oneDriveSubscription.locationId),
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
  const remote = await createOneDriveSubscription(grant, {
    changeType: "updated",
    notificationUrl: getOneDriveWebhookUrl(),
    resource: "me/drive/root",
    expirationDateTime: expiresAt.toISOString(),
    clientState,
  });

  try {
    await db
      .insert(oneDriveSubscription)
      .values({
        id: existing?.id ?? crypto.randomUUID(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        providerAccountId,
        userId: input.userId ?? null,
        subscriptionId: remote.id,
        clientStateHash: hashMicrosoftClientState(clientState),
        expiresAt,
        lastSyncedAt: new Date(),
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: oneDriveSubscription.providerAccountId,
        set: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          userId: input.userId ?? null,
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

async function stopOneDriveWatchesForScope(
  input: MicrosoftSubscriptionSyncInput,
): Promise<void> {
  const subscriptions = await db.query.oneDriveSubscription.findMany({
    where: and(
      eq(oneDriveSubscription.organizationId, input.organizationId),
      input.locationId !== null
        ? eq(oneDriveSubscription.locationId, input.locationId)
        : isNull(oneDriveSubscription.locationId),
      input.providerAccountId !== null && input.providerAccountId !== undefined
        ? eq(oneDriveSubscription.providerAccountId, input.providerAccountId)
        : undefined,
    ),
  });
  for (const subscription of subscriptions) {
    await stopOneDriveWatch(subscription);
  }
}

async function removeUnusedOneDriveWatches(
  input: MicrosoftSubscriptionSyncInput,
  usedProviderAccountIds: ReadonlySet<string>,
): Promise<void> {
  const subscriptions = await db.query.oneDriveSubscription.findMany({
    where: eq(oneDriveSubscription.organizationId, input.organizationId),
  });
  for (const subscription of subscriptions) {
    if (!usedProviderAccountIds.has(subscription.providerAccountId)) {
      await stopOneDriveWatch(subscription);
    }
  }
}

async function stopOneDriveWatch(
  subscription: InferSelectModel<typeof oneDriveSubscription>,
): Promise<void> {
  try {
    const grant = await resolveMicrosoftGrant(subscription);
    if (subscription.subscriptionId) {
      await deleteSubscription(grant, subscription.subscriptionId);
    }
  } catch {
    console.warn("[OneDrive] Failed to remove remote subscription.", {
      providerAccountId: subscription.providerAccountId,
      subscriptionId: subscription.id,
    });
  } finally {
    await db
      .delete(oneDriveSubscription)
      .where(eq(oneDriveSubscription.id, subscription.id));
  }
}

async function resolveMicrosoftGrant(input: MicrosoftSubscriptionSyncInput) {
  if (!input.providerAccountId) {
    throw new Error(
      "OneDrive subscriptions require an explicit provider account.",
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

async function createOneDriveSubscription(
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
            "Failed to create OneDrive subscription.")
        : "Failed to create OneDrive subscription.",
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
    throw new Error("Failed to delete OneDrive subscription.");
  }
}

async function initializeOneDriveTriggerStates(
  grant: ResolvedMicrosoftGrant,
  nodes: readonly OneDriveNode[],
): Promise<void> {
  if (nodes.length === 0) return;
  const existing = await db
    .select({ nodeId: oneDriveTriggerState.nodeId })
    .from(oneDriveTriggerState)
    .where(inArray(oneDriveTriggerState.nodeId, nodes.map((node) => node.id)));
  const existingIds = new Set(existing.map((row) => row.nodeId));
  const missing = nodes.filter((node) => !existingIds.has(node.id));
  if (missing.length === 0) return;
  const deltaLink = await fetchLatestOneDriveDeltaLink(grant);
  const now = new Date();
  await db.insert(oneDriveTriggerState).values(
    missing.map((node) => ({
      id: crypto.randomUUID(),
      nodeId: node.id,
      workflowId: node.workflowId,
      lastDeltaLink: deltaLink,
      createdAt: now,
      updatedAt: now,
    })),
  ).onConflictDoNothing();
}

async function fetchLatestOneDriveDeltaLink(
  grant: ResolvedMicrosoftGrant,
): Promise<string> {
  const result = await fetchOneDriveDelta(
    grant,
    `${GRAPH_API_BASE}/me/drive/root/delta?token=latest`,
  );
  return result.deltaLink;
}

async function fetchOneDriveDelta(
  grant: ResolvedMicrosoftGrant,
  initialUrl: string,
): Promise<{ items: z.infer<typeof oneDriveItemSchema>[]; deltaLink: string }> {
  const items: z.infer<typeof oneDriveItemSchema>[] = [];
  let nextUrl: string | undefined = assertMicrosoftGraphDeltaUrl(initialUrl);
  for (let page = 0; page < 50 && nextUrl; page += 1) {
    const response = await oauthAuthenticatedFetch(grant, nextUrl, {
      headers: { Authorization: `Bearer ${grant.accessToken}` },
    });
    if (!response.ok) throw new Error("Failed to fetch OneDrive delta changes.");
    const parsed = oneDriveDeltaSchema.parse(await response.json());
    items.push(...parsed.value);
    if (parsed["@odata.deltaLink"]) {
      return {
        items,
        deltaLink: assertMicrosoftGraphDeltaUrl(parsed["@odata.deltaLink"]),
      };
    }
    nextUrl = parsed["@odata.nextLink"]
      ? assertMicrosoftGraphDeltaUrl(parsed["@odata.nextLink"])
      : undefined;
  }
  throw new Error("OneDrive delta response did not provide a bounded cursor.");
}

function assertMicrosoftGraphDeltaUrl(value: string): string {
  const url = new URL(value, `${GRAPH_API_BASE}/`);
  if (url.origin !== "https://graph.microsoft.com" || !url.pathname.startsWith("/v1.0/")) {
    throw new Error("OneDrive returned an invalid delta cursor.");
  }
  return url.toString();
}

function oneDriveChangeMatchesConfig(
  change: z.infer<typeof oneDriveItemSchema>,
  config: OneDriveTriggerConfig,
): boolean {
  if (config.filePattern && !change.name?.includes(config.filePattern)) return false;
  const folderPath = config.folderPath?.trim();
  if (folderPath && folderPath !== "/") {
    const parentPath = change.parentReference?.path ?? "";
    if (!parentPath.toLowerCase().includes(`root:${folderPath}`.toLowerCase())) return false;
  }
  if (config.changeType === "deleted") return Boolean(change.deleted);
  if (config.changeType === "created") return false;
  return !change.deleted;
}

function normalizeVariableName(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)
    ? trimmed
    : "oneDriveTrigger";
}

function getOneDriveWebhookUrl(): string {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error(
      "Set APP_URL or NEXT_PUBLIC_APP_URL for OneDrive webhooks.",
    );
  }
  return `${baseUrl}/api/webhooks/onedrive`;
}
