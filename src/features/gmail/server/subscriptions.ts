"use server";

import { and, eq, lte } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { gmailSubscription } from "@/db/schema";
import type { ProviderAccountScope } from "@/features/provider-accounts/lib/scope-policy";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { inngest } from "@/inngest/client";

import { processGmailNotification } from "./notification-processor";
import {
  gmailNotificationEventId,
  type GmailNotificationInput,
} from "./pubsub-contract";
import {
  deleteGmailTriggerStatesForOrganization,
  exactLocationWhere,
  getGmailSubscriptionsForOrganization,
  getGmailTriggerNodesForOrganization,
  type GmailSubscriptionRow,
} from "./subscription-store";
import { gmailTriggerLabelSet } from "./trigger-config";
import { createGmailWatch, stopGmailWatch } from "./watch-api";

const WATCH_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 6;
const GMAIL_TRIGGER_SCOPES = getWorkflowProviderBindingSpec(
  NodeType.GMAIL_TRIGGER,
).requiredScopes;

export type GmailSubscriptionSyncInput = {
  actorUserId?: string | null;
  providerAccountId?: string | null;
  scope: ProviderAccountScope;
};

export { processGmailNotification };

export async function syncGmailWorkflowSubscriptions(
  input: GmailSubscriptionSyncInput,
): Promise<void> {
  const nodes = await getGmailTriggerNodesForOrganization(
    input.scope.organizationId,
  );
  await deleteGmailTriggerStatesForOrganization(
    input.scope.organizationId,
    nodes.map((node) => node.id),
  );

  if (nodes.length === 0) {
    await stopSubscriptionsForOrganization(input.scope.organizationId);
    return;
  }

  const existingSubscriptions = await getGmailSubscriptionsForOrganization(
    input.scope.organizationId,
  );
  const nodesByAccount = new Map<string, typeof nodes>();
  for (const node of nodes) {
    if (!node.providerAccountId) {
      throw new Error("Gmail trigger provider account binding is missing.");
    }
    nodesByAccount.set(node.providerAccountId, [
      ...(nodesByAccount.get(node.providerAccountId) ?? []),
      node,
    ]);
  }
  for (const subscription of existingSubscriptions) {
    if (!nodesByAccount.has(subscription.providerAccountId)) {
      await stopSubscription(subscription);
    }
  }

  for (const [providerAccountId, accountNodes] of nodesByAccount) {
    const providerLocationId = accountNodes[0]?.providerAccountLocationId;
    if (providerLocationId === undefined) {
      throw new Error("Gmail provider account scope is unavailable.");
    }
    const providerScope = {
      organizationId: input.scope.organizationId,
      locationId: providerLocationId,
    };
    const grant = await resolveOAuthProviderGrant({
      provider: "GOOGLE_WORKSPACE",
      providerAccountId,
      scope: providerScope,
      requiredScopes: GMAIL_TRIGGER_SCOPES,
    });
    await ensureGmailWatch({
      grant,
      actorUserId: input.actorUserId,
      labelIds: gmailTriggerLabelSet(accountNodes),
      providerAccountId: grant.providerAccountId,
      scope: providerScope,
    });
  }
}

export async function enqueueGmailNotification(
  input: GmailNotificationInput,
): Promise<void> {
  await inngest.send({
    name: "gmail/subscription.notification",
    id: gmailNotificationEventId(input.subscriptionId, input.messageId),
    data: input,
  });
}

export async function renewGmailSubscriptions(): Promise<number> {
  const threshold = new Date(Date.now() + WATCH_RENEWAL_WINDOW_MS);
  const subscriptions = await db.query.gmailSubscription.findMany({
    where: lte(gmailSubscription.expiresAt, threshold),
  });

  for (const subscription of subscriptions) {
    const scope = subscriptionScope(subscription);
    try {
      const grant = await resolveOAuthProviderGrant({
        provider: "GOOGLE_WORKSPACE",
        providerAccountId: subscription.providerAccountId,
        scope,
        requiredScopes: GMAIL_TRIGGER_SCOPES,
      });
      await ensureGmailWatch({
        grant,
        actorUserId: subscription.userId,
        force: true,
        labelIds: subscription.labelIds ?? [],
        providerAccountId: subscription.providerAccountId,
        scope,
      });
    } catch {
      console.error("[Gmail] Watch renewal failed.", {
        providerAccountId: subscription.providerAccountId,
        subscriptionId: subscription.id,
      });
    }
  }
  return subscriptions.length;
}

async function ensureGmailWatch(input: {
  grant: Awaited<ReturnType<typeof resolveOAuthProviderGrant>>;
  actorUserId?: string | null;
  force?: boolean;
  labelIds: string[];
  providerAccountId: string;
  scope: ProviderAccountScope;
}): Promise<void> {
  const labels = input.labelIds.length > 0 ? input.labelIds : ["INBOX"];
  const existing = await db.query.gmailSubscription.findFirst({
    where: and(
      eq(gmailSubscription.providerAccountId, input.providerAccountId),
      eq(gmailSubscription.organizationId, input.scope.organizationId),
      exactLocationWhere(gmailSubscription.locationId, input.scope.locationId),
    ),
  });
  const needsRefresh =
    input.force ||
    !existing?.expiresAt ||
    existing.expiresAt.getTime() - Date.now() < WATCH_RENEWAL_WINDOW_MS ||
    !sameSet(existing.labelIds ?? [], labels);
  if (!needsRefresh) return;

  const topicName = getGmailTopicName();
  const watch = await createGmailWatch({
    grant: input.grant,
    labelIds: labels,
    topicName,
  });
  const now = new Date();
  await db
    .insert(gmailSubscription)
    .values({
      id: crypto.randomUUID(),
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      providerAccountId: input.providerAccountId,
      userId: input.actorUserId ?? existing?.userId ?? null,
      emailAddress: watch.emailAddress,
      labelIds: labels,
      topicName,
      historyId: watch.historyId,
      expiresAt: watch.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: gmailSubscription.providerAccountId,
      set: {
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        userId: input.actorUserId ?? existing?.userId ?? null,
        emailAddress: watch.emailAddress,
        labelIds: labels,
        topicName,
        historyId: watch.historyId,
        expiresAt: watch.expiresAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
    });
}

async function stopSubscriptionsForOrganization(
  organizationId: string,
): Promise<void> {
  const subscriptions = await getGmailSubscriptionsForOrganization(
    organizationId,
  );
  for (const subscription of subscriptions) await stopSubscription(subscription);
}

async function stopSubscription(
  subscription: GmailSubscriptionRow,
): Promise<void> {
  try {
    const grant = await resolveOAuthProviderGrant({
      provider: "GOOGLE_WORKSPACE",
      providerAccountId: subscription.providerAccountId,
      scope: subscriptionScope(subscription),
      requiredScopes: GMAIL_TRIGGER_SCOPES,
    });
    await stopGmailWatch(grant);
  } catch {
    console.warn("[Gmail] Remote watch cleanup failed.", {
      providerAccountId: subscription.providerAccountId,
      subscriptionId: subscription.id,
    });
  }
  await db
    .delete(gmailSubscription)
    .where(
      and(
        eq(gmailSubscription.id, subscription.id),
        eq(gmailSubscription.organizationId, subscription.organizationId),
        exactLocationWhere(gmailSubscription.locationId, subscription.locationId),
        eq(gmailSubscription.providerAccountId, subscription.providerAccountId),
      ),
    );
}

function sameSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const values = new Set(left);
  return right.every((item) => values.has(item));
}

function subscriptionScope(
  subscription: GmailSubscriptionRow,
): ProviderAccountScope {
  return {
    organizationId: subscription.organizationId,
    locationId: subscription.locationId,
  };
}

function getGmailTopicName(): string {
  const topic = process.env.GMAIL_PUBSUB_TOPIC?.trim();
  if (!topic) throw new Error("Gmail Pub/Sub topic is not configured.");
  return topic;
}
