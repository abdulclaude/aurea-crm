import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { gmailSubscription, providerAccount } from "@/db/schema";
import {
  bearerTokenFromHeader,
  getGmailPubSubAuthConfig,
  GmailPubSubConfigurationError,
  parseGmailPubSubNotification,
  type GmailPubSubAuthConfig,
  type GmailPubSubNotification,
  verificationTokenMatches,
  verifyGmailPubSubOidcToken,
} from "@/features/gmail/server/pubsub-contract";
import { enqueueGmailNotification } from "@/features/gmail/server/subscriptions";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

export const runtime = "nodejs";

const MAX_GMAIL_PUBSUB_BYTES = 256 * 1024;

export async function POST(request: NextRequest): Promise<Response> {
  let config: GmailPubSubAuthConfig;
  try {
    config = getGmailPubSubAuthConfig();
  } catch (error) {
    if (error instanceof GmailPubSubConfigurationError) {
      return response("Gmail Pub/Sub authentication is unavailable.", 503);
    }
    throw error;
  }

  if (
    !verificationTokenMatches({
      expected: config.verificationToken,
      provided: request.nextUrl.searchParams.get("token"),
    })
  ) {
    return response("Unauthorized.", 401);
  }

  const bearerToken = bearerTokenFromHeader(
    request.headers.get("authorization"),
  );
  if (!bearerToken) return response("Unauthorized.", 401);

  let rawBody: string;
  try {
    rawBody = await readBoundedRawBody(request, MAX_GMAIL_PUBSUB_BYTES);
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return response("Payload too large.", 413);
    }
    return response("Unable to read payload.", 400);
  }

  try {
    await verifyGmailPubSubOidcToken({
      config,
      token: bearerToken,
    });
  } catch {
    return response("Unauthorized.", 401);
  }

  let notification: GmailPubSubNotification;
  try {
    notification = parseGmailPubSubNotification(rawBody);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return response("Invalid Pub/Sub payload.", 400);
    }
    return response("Invalid Pub/Sub payload.", 400);
  }

  try {
    const subscriptions = await db
      .select({
        id: gmailSubscription.id,
        organizationId: gmailSubscription.organizationId,
        locationId: gmailSubscription.locationId,
        providerAccountId: gmailSubscription.providerAccountId,
      })
      .from(gmailSubscription)
      .innerJoin(
        providerAccount,
        and(
          eq(providerAccount.id, gmailSubscription.providerAccountId),
          eq(providerAccount.organizationId, gmailSubscription.organizationId),
          or(
            eq(providerAccount.locationId, gmailSubscription.locationId),
            and(
              isNull(providerAccount.locationId),
              isNull(gmailSubscription.locationId),
            ),
          ),
        ),
      )
      .where(
        and(
          eq(gmailSubscription.emailAddress, notification.emailAddress),
          eq(providerAccount.provider, "GOOGLE_WORKSPACE"),
          eq(providerAccount.status, "ACTIVE"),
        ),
      );
    if (subscriptions.length === 0) return new Response(null, { status: 204 });

    await Promise.all(
      subscriptions.map((subscription) =>
        enqueueGmailNotification({
          subscriptionId: subscription.id,
          organizationId: subscription.organizationId,
          locationId: subscription.locationId,
          providerAccountId: subscription.providerAccountId,
          emailAddress: notification.emailAddress,
          historyId: notification.historyId,
          messageId: notification.messageId,
        }),
      ),
    );
    return new Response(null, { status: 204 });
  } catch {
    console.error("[Gmail] Pub/Sub notification enqueue failed.", {
      messageId: notification.messageId,
    });
    return response("Webhook processing failed.", 500);
  }
}

function response(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
