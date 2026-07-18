import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import type { ConversationChannel } from "@/db/enums";
import { client, inboxMessage, inboxRoute, smsConfig } from "@/db/schema";
import {
  normalizeEmailDestination,
  normalizePhoneDestination,
} from "@/features/delivery/lib/normalization";
import type {
  DeliveryPayload,
  DeliverySenderRef,
} from "@/features/delivery/lib/payload-schemas";
import { resolveEmailSender } from "@/features/delivery/server/email-sender";
import {
  enqueueDeliveryInTransaction,
  type DeliveryTransaction,
} from "@/features/delivery/server/outbox";
import { resolveSmsSender } from "@/features/sms/server/sms-sender";
import { resolveInboxOutboundRoute } from "@/features/inbox/server/outbound-route";
import { reserveSmsSpend } from "@/features/communications/server/sms-spend-policy";

type PrepareInboxDeliveryInput = {
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  channel: ConversationChannel;
  subject: string | null;
  content: string;
  conversationId: string;
  routeId?: string | null;
};

type PreparedInboxDelivery = {
  organizationId: string;
  locationId: string | null;
  clientId: string;
  channel: "EMAIL" | "SMS" | "APP";
  provider: "RESEND" | "TWILIO" | "VONAGE" | "MESSAGEBIRD" | "INTERNAL";
  providerAccountId: string | null;
  providerAccountRef: string;
  destination: string;
  sender: DeliverySenderRef;
  payload: DeliveryPayload;
  smsConfigId: string | null;
  routeId: string | null;
  replyRoutingTokenHash: string | null;
};

export async function prepareInboxDelivery(
  input: PrepareInboxDeliveryInput,
): Promise<PreparedInboxDelivery> {
  if (!input.clientId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select a customer before sending a message.",
    });
  }

  const [recipient] = await db
    .select({ id: client.id, email: client.email, phone: client.phone })
    .from(client)
    .where(
      and(
        eq(client.id, input.clientId),
        eq(client.organizationId, input.organizationId),
        input.locationId
          ? eq(client.locationId, input.locationId)
          : isNull(client.locationId),
      ),
    )
    .limit(1);
  if (!recipient) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Customer not found in the active workspace.",
    });
  }

  if (input.channel === "EMAIL") {
    if (!recipient.email) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This customer does not have an email address.",
      });
    }
    const destination = normalizeEmailDestination(recipient.email);
    const resolvedSender = await resolveEmailSender({
      organizationId: input.organizationId,
      locationId: input.locationId,
      purpose: "ONE_TO_ONE",
    });
    const route = await resolveInboxOutboundRoute({
      organizationId: input.organizationId,
      locationId: input.locationId,
      providerAccountId: resolvedSender.providerAccountRef,
      conversationId: input.conversationId,
      routeId: input.routeId,
    });
    return {
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: recipient.id,
      channel: "EMAIL",
      provider: "RESEND",
      providerAccountId: resolvedSender.providerAccountRef,
      providerAccountRef: resolvedSender.providerAccountRef,
      destination,
      sender: resolvedSender.sender,
      payload: {
        channel: "EMAIL",
        subject: input.subject?.trim() || "New message",
        text: input.content,
        replyTo: route?.replyTo,
      },
      smsConfigId: null,
      routeId: route?.routeId ?? null,
      replyRoutingTokenHash: route?.replyRoutingTokenHash ?? null,
    };
  }

  if (input.channel === "SMS") {
    if (!recipient.phone) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This customer does not have a phone number.",
      });
    }
    const destination = normalizePhoneDestination(recipient.phone);
    const [preferredRoute] = input.routeId
      ? await db
          .select({
            id: inboxRoute.id,
            providerAccountId: inboxRoute.providerAccountId,
            fromNumber: inboxRoute.inboundAddressNormalized,
          })
          .from(inboxRoute)
          .where(
            and(
              eq(inboxRoute.id, input.routeId),
              eq(inboxRoute.organizationId, input.organizationId),
              input.locationId
                ? eq(inboxRoute.locationId, input.locationId)
                : isNull(inboxRoute.locationId),
              eq(inboxRoute.channel, "SMS"),
              eq(inboxRoute.isActive, true),
            ),
          )
          .limit(1)
      : [undefined];
    if (input.routeId && !preferredRoute) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The original SMS route is no longer available.",
      });
    }
    const config = await resolveSmsSender({
      organizationId: input.organizationId,
      locationId: input.locationId,
      preferredProviderAccountId: preferredRoute?.providerAccountId ?? undefined,
      preferredFromNumber: preferredRoute?.fromNumber ?? undefined,
    });
    if (!config?.isActive) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "SMS is not configured for this organization.",
      });
    }
    return {
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: recipient.id,
      channel: "SMS",
      provider: config.provider,
      providerAccountId: config.providerAccountId,
      providerAccountRef: config.id,
      destination,
      sender: { kind: config.kind, id: config.id },
      payload: { channel: "SMS", body: input.content },
      smsConfigId: config.kind === "SMS_CONFIG" ? config.id : null,
      routeId: preferredRoute?.id ?? null,
      replyRoutingTokenHash: null,
    };
  }

  return {
    organizationId: input.organizationId,
    locationId: input.locationId,
    clientId: recipient.id,
    channel: "APP",
    provider: "INTERNAL",
    providerAccountId: null,
    providerAccountRef: "internal:inbox",
    destination: recipient.id,
    sender: { kind: "INTERNAL", key: "inbox" },
    payload: {
      channel: "APP",
      title: input.subject?.trim() || undefined,
      body: input.content,
      data: { clientId: recipient.id },
    },
    smsConfigId: null,
    routeId: null,
    replyRoutingTokenHash: null,
  };
}

type EnqueueInboxMessageInput = {
  conversationId: string;
  senderUserId: string;
  content: string;
  prepared: PreparedInboxDelivery;
};

export async function enqueueInboxMessageInTransaction(
  tx: DeliveryTransaction,
  input: EnqueueInboxMessageInput,
) {
  const messageId = createId();
  const { delivery, suppression } = await enqueueDeliveryInTransaction(tx, {
    organizationId: input.prepared.organizationId,
    locationId: input.prepared.locationId,
    clientId: input.prepared.clientId,
    channel: input.prepared.channel,
    purpose: "ONE_TO_ONE",
    provider: input.prepared.provider,
    providerAccountId: input.prepared.providerAccountId,
    providerAccountRef: input.prepared.providerAccountRef,
    sourceType: "INBOX_MESSAGE",
    sourceId: messageId,
    destination: input.prepared.destination,
    sender: input.prepared.sender,
    payload: input.prepared.payload,
    idempotencyKey: `inbox-message:${messageId}`,
    maxAttempts: 5,
  });

  if (input.prepared.smsConfigId && !suppression) {
    const [reserved] = await tx
      .update(smsConfig)
      .set({
        sentThisMonth: sql`${smsConfig.sentThisMonth} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(smsConfig.id, input.prepared.smsConfigId),
          eq(smsConfig.isActive, true),
          sql`${smsConfig.sentThisMonth} + 1 <= ${smsConfig.monthlyLimit}`,
        ),
      )
      .returning({ id: smsConfig.id });
    if (!reserved) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "The monthly SMS limit would be exceeded.",
      });
    }
  }
  if (
    input.prepared.sender.kind === "TWILIO_PHONE_NUMBER" &&
    input.prepared.providerAccountId &&
    input.prepared.payload.channel === "SMS" &&
    !suppression
  ) {
    await reserveSmsSpend({
      tx,
      organizationId: input.prepared.organizationId,
      locationId: input.prepared.locationId,
      providerAccountId: input.prepared.providerAccountId,
      phoneNumberId: input.prepared.sender.id,
      deliveries: [{ id: delivery.id, clientId: input.prepared.clientId }],
      body: input.prepared.payload.body,
      at: new Date(),
    });
  }

  const [message] = await tx
    .insert(inboxMessage)
    .values({
      id: messageId,
      conversationId: input.conversationId,
      direction: "OUTBOUND",
      content: input.content,
      isRead: true,
      senderUserId: input.senderUserId,
      deliveryId: delivery.id,
    })
    .returning();
  if (!message) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create inbox message.",
    });
  }

  return { message, suppressed: Boolean(suppression) };
}
