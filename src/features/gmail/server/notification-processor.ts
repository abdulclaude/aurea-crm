import "server-only";

import { and, eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";

import { db } from "@/db";
import { gmailSubscription, gmailTriggerState } from "@/db/schema";
import { NodeType } from "@/db/enums";
import type { ProviderAccountScope } from "@/features/provider-accounts/lib/scope-policy";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { sendWorkflowExecution } from "@/inngest/utils";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";

import type { GmailMessage } from "./messages";
import { fetchGmailHistoryMessages } from "./history";
import {
  gmailWorkflowEventId,
  type GmailNotificationInput,
} from "./pubsub-contract";
import {
  exactLocationWhere,
  findExactGmailSubscription,
  getGmailTriggerNodesForOrganization,
  type GmailSubscriptionRow,
  type GmailTriggerNode,
} from "./subscription-store";
import {
  gmailTriggerVariableName,
  parseGmailTriggerConfig,
} from "./trigger-config";

const GMAIL_TRIGGER_SCOPES = getWorkflowProviderBindingSpec(
  NodeType.GMAIL_TRIGGER,
).requiredScopes;

export async function processGmailNotification(
  input: GmailNotificationInput,
): Promise<{ processed: boolean; reason?: string }> {
  const subscription = await findExactGmailSubscription(input);
  if (!subscription) {
    throw new NonRetriableError("Gmail subscription is no longer active.");
  }
  if (subscription.lastPubSubMessageId === input.messageId) {
    return { processed: false, reason: "duplicate" };
  }

  const scope = subscriptionScope(subscription);
  const nodes = await getGmailTriggerNodesForOrganization(
    subscription.organizationId,
    subscription.providerAccountId,
  );
  if (nodes.length === 0) {
    await markNotificationProcessed(subscription, input);
    return { processed: false, reason: "no-active-triggers" };
  }

  const grant = await resolveOAuthProviderGrant({
    provider: "GOOGLE_WORKSPACE",
    providerAccountId: subscription.providerAccountId,
    scope,
    requiredScopes: GMAIL_TRIGGER_SCOPES,
  });
  if (!subscription.historyId) {
    await markNotificationProcessed(subscription, input);
    return { processed: false, reason: "cursor-initialized" };
  }
  let failed = false;
  let cursorExpired = false;
  for (const node of nodes) {
    try {
      const config = parseGmailTriggerConfig(node.data);
      const nodeHistory = await fetchGmailHistoryMessages({
        config,
        grant,
        startHistoryId: subscription.historyId,
      });
      if (nodeHistory.status === "CURSOR_EXPIRED") {
        cursorExpired = true;
        break;
      }
      for (const message of nodeHistory.messages) {
        await maybeTriggerWorkflowFromMessage({
          message,
          node,
          scope: {
            organizationId: node.organizationId,
            locationId: node.locationId,
          },
          subscriptionId: subscription.id,
        });
      }
    } catch {
      failed = true;
    }
  }
  if (failed) {
    throw new Error("Gmail workflow notification processing failed.");
  }

  await markNotificationProcessed(subscription, input);
  return cursorExpired
    ? { processed: false, reason: "cursor-expired" }
    : { processed: true };
}

async function maybeTriggerWorkflowFromMessage(input: {
  message: GmailMessage;
  node: GmailTriggerNode;
  scope: ProviderAccountScope;
  subscriptionId: string;
}): Promise<void> {
  const config = parseGmailTriggerConfig(input.node.data);
  const payload = {
    fetchedAt: new Date().toISOString(),
    labelId: config.labelId?.trim() || "INBOX",
    query: config.query?.trim() || undefined,
    messages: [input.message],
  };
  const latestId = input.message.id;

  const state = await db.query.gmailTriggerState.findFirst({
    where: eq(gmailTriggerState.nodeId, input.node.id),
  });
  if (state?.lastMessageId === latestId) return;

  const variableName = gmailTriggerVariableName(config.variableName);
  const initialData: Record<string, unknown> = { [variableName]: payload };
  if (variableName !== "gmailTrigger") initialData.gmailTrigger = payload;
  await sendWorkflowExecution({
    workflowId: input.node.workflowId,
    initialData,
    idempotencyKey: gmailWorkflowEventId({
      latestMessageId: latestId,
      nodeId: input.node.id,
      subscriptionId: input.subscriptionId,
    }),
    expectedOrganizationId: input.scope.organizationId,
    expectedLocationId: input.scope.locationId,
  });

  const now = new Date();
  await db
    .insert(gmailTriggerState)
    .values({
      id: crypto.randomUUID(),
      nodeId: input.node.id,
      workflowId: input.node.workflowId,
      lastMessageId: latestId,
      lastTriggeredAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: gmailTriggerState.nodeId,
      set: {
        workflowId: input.node.workflowId,
        lastMessageId: latestId,
        lastTriggeredAt: now,
        updatedAt: now,
      },
    });
}

async function markNotificationProcessed(
  subscription: GmailSubscriptionRow,
  input: GmailNotificationInput,
): Promise<void> {
  const now = new Date();
  await db
    .update(gmailSubscription)
    .set({
      historyId: maxHistoryId(subscription.historyId, input.historyId),
      lastPubSubMessageId: input.messageId,
      lastSyncedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(gmailSubscription.id, subscription.id),
        eq(gmailSubscription.organizationId, subscription.organizationId),
        exactLocationWhere(gmailSubscription.locationId, subscription.locationId),
        eq(gmailSubscription.providerAccountId, subscription.providerAccountId),
      ),
    );
}

function maxHistoryId(current: string | null, incoming: string): string {
  if (!current) return incoming;
  return BigInt(incoming) > BigInt(current) ? incoming : current;
}

function subscriptionScope(
  subscription: GmailSubscriptionRow,
): ProviderAccountScope {
  return {
    organizationId: subscription.organizationId,
    locationId: subscription.locationId,
  };
}
