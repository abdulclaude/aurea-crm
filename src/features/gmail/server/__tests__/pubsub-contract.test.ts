import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  bearerTokenFromHeader,
  getGmailPubSubAuthConfig,
  GmailPubSubConfigurationError,
  gmailNotificationEventId,
  gmailWorkflowEventId,
  parseGmailPubSubNotification,
  verificationTokenMatches,
  verifyGmailPubSubOidcToken,
} from "../pubsub-contract";

test("parses the official Gmail Pub/Sub envelope and base64url data", () => {
  const data = Buffer.from(
    JSON.stringify({
      emailAddress: "Owner@Example.com",
      historyId: "9876543210",
    }),
  ).toString("base64url");
  const notification = parseGmailPubSubNotification(
    JSON.stringify({
      message: {
        data,
        messageId: "pubsub-message-1",
        publishTime: "2026-07-14T10:00:00Z",
      },
      subscription: "projects/project/subscriptions/gmail-push",
    }),
  );

  assert.deepEqual(notification, {
    emailAddress: "owner@example.com",
    historyId: "9876543210",
    messageId: "pubsub-message-1",
  });
});

test("rejects malformed Gmail notification data and missing message identity", () => {
  assert.throws(() =>
    parseGmailPubSubNotification(
      JSON.stringify({ message: { data: "not-json", messageId: "message-1" } }),
    ),
  );
  assert.throws(() =>
    parseGmailPubSubNotification(
      JSON.stringify({
        message: {
          data: Buffer.from(
            JSON.stringify({ emailAddress: "a@example.com", historyId: "1" }),
          ).toString("base64url"),
        },
      }),
    ),
  );
});

test("optional verification tokens and bearer headers fail closed", () => {
  assert.equal(
    verificationTokenMatches({ expected: undefined, provided: null }),
    true,
  );
  assert.equal(
    verificationTokenMatches({ expected: "secret", provided: "secret" }),
    true,
  );
  assert.equal(
    verificationTokenMatches({ expected: "secret", provided: "wrong" }),
    false,
  );
  assert.equal(bearerTokenFromHeader("Bearer signed.jwt.token"), "signed.jwt.token");
  assert.equal(bearerTokenFromHeader("Basic value"), null);
  assert.equal(bearerTokenFromHeader("Bearer"), null);
});

test("requires OIDC audience configuration and the configured service account", async () => {
  assert.throws(
    () => getGmailPubSubAuthConfig({}),
    GmailPubSubConfigurationError,
  );
  const config = getGmailPubSubAuthConfig({
    GMAIL_PUBSUB_OIDC_AUDIENCE: "https://crm.example.com/api/webhooks/gmail",
    GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL: "push@example-project.iam.gserviceaccount.com",
  });
  let verifiedAudience = "";
  await verifyGmailPubSubOidcToken({
    config,
    token: "signed-token",
    verifier: async ({ audience }) => {
      verifiedAudience = audience;
      return {
        email: "push@example-project.iam.gserviceaccount.com",
        email_verified: true,
      };
    },
  });
  assert.equal(verifiedAudience, config.audience);
  await assert.rejects(
    verifyGmailPubSubOidcToken({
      config,
      token: "signed-token",
      verifier: async () => ({
        email: "other@example-project.iam.gserviceaccount.com",
        email_verified: true,
      }),
    }),
  );
  await assert.rejects(
    verifyGmailPubSubOidcToken({
      config,
      token: "signed-token",
      verifier: async () => ({
        email: "push@example-project.iam.gserviceaccount.com",
        email_verified: false,
      }),
    }),
  );
});

test("notification and workflow idempotency keys are stable and scoped", () => {
  assert.equal(
    gmailNotificationEventId("subscription-1", "message-1"),
    "gmail:subscription-1:message-1",
  );
  const first = gmailWorkflowEventId({
    subscriptionId: "subscription-1",
    nodeId: "node-1",
    latestMessageId: "gmail-message-1",
  });
  assert.equal(
    first,
    gmailWorkflowEventId({
      subscriptionId: "subscription-1",
      nodeId: "node-1",
      latestMessageId: "gmail-message-1",
    }),
  );
  assert.notEqual(
    first,
    gmailWorkflowEventId({
      subscriptionId: "subscription-2",
      nodeId: "node-1",
      latestMessageId: "gmail-message-1",
    }),
  );
});

test("Gmail subscription runtime has no user-global credential or workflow lookup", () => {
  const subscriptionsSource = readFileSync(
    path.join(process.cwd(), "src/features/gmail/server/subscriptions.ts"),
    "utf8",
  );
  const processorSource = readFileSync(
    path.join(process.cwd(), "src/features/gmail/server/notification-processor.ts"),
    "utf8",
  );
  const routeSource = readFileSync(
    path.join(process.cwd(), "src/app/api/webhooks/gmail/route.ts"),
    "utf8",
  );

  for (const forbidden of [
    "db.query.account",
    "accountTable",
    "eq(apps.userId",
    "eq(workflows.userId",
    "eq(gmailSubscription.userId",
    "request.json()",
  ]) {
    assert.equal(
      `${subscriptionsSource}\n${processorSource}\n${routeSource}`.includes(forbidden),
      false,
      `unexpected user-global or unbounded pattern: ${forbidden}`,
    );
  }
  assert.equal(
    processorSource.includes(
      "getGmailTriggerNodesForOrganization(\n    subscription.organizationId,\n    subscription.providerAccountId",
    ),
    true,
  );
  assert.equal(
    subscriptionsSource.includes(
      "providerAccountId: subscription.providerAccountId",
    ),
    true,
  );
  assert.equal(
    subscriptionsSource.includes(
      "getGmailSubscriptionsForOrganization(\n    input.scope.organizationId",
    ),
    true,
  );
  assert.equal(routeSource.includes("readBoundedRawBody"), true);
  assert.equal(routeSource.includes("verifyGmailPubSubOidcToken"), true);
  assert.equal(routeSource.includes("messageId: notification.messageId"), true);
  assert.equal(routeSource.includes(".innerJoin("), true);
  assert.equal(routeSource.includes('eq(providerAccount.status, "ACTIVE")'), true);
  assert.equal(
    routeSource.includes(
      "eq(providerAccount.organizationId, gmailSubscription.organizationId)",
    ),
    true,
  );
});
