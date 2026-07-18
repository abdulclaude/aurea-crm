import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { Resend } from "resend";
import sanitizeHtml from "sanitize-html";
import {
  and,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  inboundMessageReceipt,
  inboxConversation,
  inboxConversationEvent,
  inboxMessage,
  inboxRoute,
} from "@/db/schema";
import { normalizeEmailDestination } from "@/features/delivery/lib/normalization";
import {
  hashConversationReplyToken,
  parseConversationReplyAddress,
} from "@/features/inbox/lib/reply-routing";
import {
  hasTrustworthySenderAuthentication,
  resendReceivingEmailSchema,
  type ResendReceivingEmail,
} from "@/features/inbox/server/inbound-contracts";
import { resolveProviderAccount } from "@/features/provider-accounts/server/resolver";
import { findActiveMailboxBlock } from "@/features/communications/server/control-service";

const RECEIPT_LEASE_MS = 2 * 60_000;
const MAX_RECEIPT_ATTEMPTS = 5;
const MAX_STORED_MESSAGE_CHARACTERS = 100_000;

type ClaimedReceipt = typeof inboundMessageReceipt.$inferSelect & {
  claimToken: string;
};

type MatchedRoute = {
  route: typeof inboxRoute.$inferSelect;
  recipient: string;
  replyRoutingToken: string | null;
};

function exactLocationCondition(
  locationId: string | null,
  column: typeof inboxConversation.locationId | typeof client.locationId,
) {
  return locationId ? eq(column, locationId) : isNull(column);
}

function extractEmailAddress(value: string): string | null {
  const bracketed = /<([^<>]+)>\s*$/.exec(value)?.[1];
  try {
    return normalizeEmailDestination(bracketed ?? value);
  } catch {
    return null;
  }
}

function getHeader(
  headers: Record<string, string>,
  name: string,
): string | null {
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return entry?.[1] ?? null;
}

function messageContent(email: ResendReceivingEmail): string {
  const content =
    email.text?.trim() ||
    (email.html
      ? sanitizeHtml(email.html, {
          allowedTags: [],
          allowedAttributes: {},
        }).trim()
      : "") ||
    "[No text content]";
  return content.slice(0, MAX_STORED_MESSAGE_CHARACTERS);
}

async function claimReceipt(receiptId: string): Promise<ClaimedReceipt | null> {
  const now = new Date();
  const claimToken = createId();
  const leaseExpiresAt = new Date(now.getTime() + RECEIPT_LEASE_MS);
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(inboundMessageReceipt)
      .where(
        and(
          eq(inboundMessageReceipt.id, receiptId),
          or(
            inArray(inboundMessageReceipt.status, ["PENDING", "FAILED"]),
            and(
              eq(inboundMessageReceipt.status, "PROCESSING"),
              lt(inboundMessageReceipt.leaseExpiresAt, now),
            ),
          ),
        ),
      )
      .limit(1)
      .for("update");
    if (!candidate || candidate.attemptCount >= MAX_RECEIPT_ATTEMPTS) {
      if (candidate && candidate.status !== "DEAD_LETTER") {
        await tx
          .update(inboundMessageReceipt)
          .set({
            status: "DEAD_LETTER",
            claimToken: null,
            leaseExpiresAt: null,
            updatedAt: now,
          })
          .where(eq(inboundMessageReceipt.id, candidate.id));
      }
      return null;
    }

    const [claimed] = await tx
      .update(inboundMessageReceipt)
      .set({
        status: "PROCESSING",
        claimToken,
        leaseExpiresAt,
        attemptCount: candidate.attemptCount + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(inboundMessageReceipt.id, candidate.id),
          eq(inboundMessageReceipt.status, candidate.status),
        ),
      )
      .returning();
    return claimed?.claimToken ? { ...claimed, claimToken: claimed.claimToken } : null;
  });
}

async function findRoute(
  receipt: ClaimedReceipt,
  recipients: readonly string[],
): Promise<MatchedRoute | null> {
  const routes = await db
    .select()
    .from(inboxRoute)
    .where(
      and(
        eq(inboxRoute.organizationId, receipt.organizationId),
        eq(inboxRoute.providerAccountId, receipt.providerAccountId),
        eq(inboxRoute.channel, "EMAIL"),
        eq(inboxRoute.isActive, true),
      ),
    );
  const matches: MatchedRoute[] = [];
  for (const recipient of recipients) {
    for (const route of routes) {
      let parsed: ReturnType<typeof parseConversationReplyAddress>;
      try {
        parsed = parseConversationReplyAddress({
          recipient,
          inboundAddress: route.inboundAddressNormalized,
        });
      } catch {
        continue;
      }
      if (parsed.kind === "INVALID_TOKEN") {
        throw new Error("INVALID_REPLY_TOKEN");
      }
      if (parsed.kind === "EXACT") {
        matches.push({ route, recipient, replyRoutingToken: null });
      } else if (parsed.kind === "CONVERSATION") {
        matches.push({
          route,
          recipient,
          replyRoutingToken: parsed.routingToken,
        });
      }
    }
  }
  if (matches.length !== 1) return null;
  return matches[0] ?? null;
}

async function findUnambiguousClient(input: {
  organizationId: string;
  locationId: string | null;
  sender: string;
}): Promise<string | null> {
  const matches = await db
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        eq(client.organizationId, input.organizationId),
        exactLocationCondition(input.locationId, client.locationId),
        eq(sql`lower(${client.email})`, input.sender),
      ),
    )
    .limit(2);
  return matches.length === 1 ? (matches[0]?.id ?? null) : null;
}

async function senderMatchesConversationClient(input: {
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  sender: string;
}): Promise<boolean> {
  if (!input.clientId) return false;
  const [matchedClient] = await db
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        eq(client.id, input.clientId),
        eq(client.organizationId, input.organizationId),
        exactLocationCondition(input.locationId, client.locationId),
        eq(sql`lower(${client.email})`, input.sender),
      ),
    )
    .limit(1);
  return matchedClient !== undefined;
}

async function applyEmail(
  receipt: ClaimedReceipt,
  email: ResendReceivingEmail,
): Promise<void> {
  const match = await findRoute(receipt, email.to);
  if (!match) {
    await completeReceipt(receipt, "IGNORED", "INBOUND_ROUTE_NOT_UNIQUE");
    return;
  }
  const sender = extractEmailAddress(email.from);
  if (!sender) {
    await completeReceipt(receipt, "IGNORED", "INVALID_SENDER_ADDRESS");
    return;
  }
  const mailboxBlock = await findActiveMailboxBlock({
    organizationId: match.route.organizationId,
    locationId: match.route.locationId,
    sender,
  });
  if (mailboxBlock) {
    await completeReceipt(
      receipt,
      "IGNORED",
      "MAILBOX_SENDER_BLOCKED",
      "The inbound sender matched an active mailbox blocklist entry.",
    );
    return;
  }

  const existingConversation = match.replyRoutingToken
    ? await db.query.inboxConversation.findFirst({
        where: and(
          eq(
            inboxConversation.replyRoutingTokenHash,
            hashConversationReplyToken(match.replyRoutingToken),
          ),
          eq(inboxConversation.organizationId, match.route.organizationId),
          exactLocationCondition(
            match.route.locationId,
            inboxConversation.locationId,
          ),
          eq(inboxConversation.routeId, match.route.id),
          eq(inboxConversation.channel, "EMAIL"),
        ),
      })
    : null;
  if (match.replyRoutingToken && !existingConversation) {
    await completeReceipt(receipt, "IGNORED", "CONVERSATION_ROUTE_MISMATCH");
    return;
  }
  if (
    existingConversation &&
    !(await senderMatchesConversationClient({
      organizationId: match.route.organizationId,
      locationId: match.route.locationId,
      clientId: existingConversation.clientId,
      sender,
    }))
  ) {
    await completeReceipt(receipt, "IGNORED", "REPLY_SENDER_MISMATCH");
    return;
  }
  const senderAuthenticated = hasTrustworthySenderAuthentication(email.headers);
  const clientId =
    existingConversation?.clientId ??
    (senderAuthenticated
      ? await findUnambiguousClient({
          organizationId: match.route.organizationId,
          locationId: match.route.locationId,
          sender,
        })
      : null);

  await db.transaction(async (tx) => {
    const [lockedReceipt] = await tx
      .select({ id: inboundMessageReceipt.id })
      .from(inboundMessageReceipt)
      .where(
        and(
          eq(inboundMessageReceipt.id, receipt.id),
          eq(inboundMessageReceipt.status, "PROCESSING"),
          eq(inboundMessageReceipt.claimToken, receipt.claimToken),
        ),
      )
      .limit(1)
      .for("update");
    if (!lockedReceipt) return;

    const [duplicate] = await tx
      .select({ id: inboxMessage.id })
      .from(inboxMessage)
      .where(
        and(
          eq(inboxMessage.providerAccountId, receipt.providerAccountId),
          eq(inboxMessage.externalMessageId, email.id),
        ),
      )
      .limit(1);
    if (duplicate) {
      await tx
        .update(inboundMessageReceipt)
        .set({
          locationId: match.route.locationId,
          routeId: match.route.id,
          status: "PROCESSED",
          processedAt: new Date(),
          claimToken: null,
          leaseExpiresAt: null,
          lastErrorCode: "DUPLICATE_PROVIDER_MESSAGE",
          updatedAt: new Date(),
        })
        .where(eq(inboundMessageReceipt.id, receipt.id));
      return;
    }

    await tx
      .update(inboundMessageReceipt)
      .set({
        locationId: match.route.locationId,
        routeId: match.route.id,
        updatedAt: new Date(),
      })
      .where(eq(inboundMessageReceipt.id, receipt.id));

    const now = new Date();
    const conversationId = existingConversation?.id ?? createId();
    if (!existingConversation) {
      await tx.insert(inboxConversation).values({
        id: conversationId,
        organizationId: match.route.organizationId,
        locationId: match.route.locationId,
        clientId,
        routeId: match.route.id,
        assigneeStaffIdentityId:
          match.route.defaultAssigneeStaffIdentityId ?? null,
        assignedAt: match.route.defaultAssigneeStaffIdentityId ? now : null,
        channel: "EMAIL",
        status: "OPEN",
        subject: email.subject || null,
        isRead: false,
        lastMessageAt: now,
        updatedAt: now,
      });
    }

    const messageId = createId();
    await tx.insert(inboxMessage).values({
      id: messageId,
      conversationId,
      direction: "INBOUND",
      content: messageContent(email),
      isRead: false,
      providerAccountId: receipt.providerAccountId,
      inboundReceiptId: receipt.id,
      externalMessageId: email.id,
      externalThreadId:
        getHeader(email.headers, "in-reply-to") ?? email.message_id,
      fromAddress: sender,
      toAddress: normalizeEmailDestination(match.recipient),
      subject: email.subject || null,
      createdAt: new Date(email.created_at),
    });
    await tx
      .update(inboxConversation)
      .set({
        clientId,
        routeId: match.route.id,
        status: "OPEN",
        isRead: false,
        subject: existingConversation?.subject ?? email.subject ?? null,
        lastMessageAt: new Date(email.created_at),
        updatedAt: now,
      })
      .where(eq(inboxConversation.id, conversationId));
    await tx.insert(inboxConversationEvent).values({
      id: createId(),
      organizationId: match.route.organizationId,
      locationId: match.route.locationId,
      conversationId,
      eventType: "INBOUND_RECEIVED",
      targetStaffIdentityId:
        existingConversation?.assigneeStaffIdentityId ??
        match.route.defaultAssigneeStaffIdentityId,
      metadata: {
        provider: "RESEND",
        receiptId: receipt.id,
        attachmentCount: email.attachments.length,
        senderAuthenticated,
      },
    });
    await tx
      .update(inboundMessageReceipt)
      .set({
        locationId: match.route.locationId,
        routeId: match.route.id,
        status: "PROCESSED",
        processedAt: now,
        claimToken: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        safeMetadata: {
          attachmentCount: email.attachments.length,
          senderAuthenticated,
        },
        updatedAt: now,
      })
      .where(eq(inboundMessageReceipt.id, receipt.id));
  });
}

async function completeReceipt(
  receipt: ClaimedReceipt,
  status: "IGNORED" | "FAILED" | "DEAD_LETTER",
  code: string,
  message?: string,
): Promise<void> {
  await db
    .update(inboundMessageReceipt)
    .set({
      status,
      processedAt: status === "IGNORED" ? new Date() : null,
      claimToken: null,
      leaseExpiresAt: null,
      lastErrorCode: code,
      lastErrorMessage: message?.slice(0, 500) ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inboundMessageReceipt.id, receipt.id),
        eq(inboundMessageReceipt.claimToken, receipt.claimToken),
      ),
    );
}

export async function processInboundMessageReceipt(
  receiptId: string,
): Promise<{ status: string }> {
  const receipt = await claimReceipt(receiptId);
  if (!receipt) return { status: "NOT_CLAIMED" };

  try {
    if (receipt.provider !== "RESEND" || receipt.eventType !== "email.received") {
      await completeReceipt(receipt, "IGNORED", "UNSUPPORTED_INBOUND_EVENT");
      return { status: "IGNORED" };
    }
    const account = await resolveProviderAccount({
      providerAccountId: receipt.providerAccountId,
      provider: "RESEND",
      scope: {
        organizationId: receipt.organizationId,
        locationId: receipt.locationId,
      },
    });
    const response = await new Resend(account.secret).emails.receiving.get(
      receipt.providerMessageId,
    );
    if (response.error || !response.data) {
      throw new Error(
        response.error?.message ?? "Resend did not return the received email.",
      );
    }
    const email = resendReceivingEmailSchema.parse(response.data);
    if (email.id !== receipt.providerMessageId) {
      throw new Error("Resend returned a different received email identity.");
    }
    await applyEmail(receipt, email);
    return { status: "PROCESSED" };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_REPLY_TOKEN") {
      await completeReceipt(
        receipt,
        "IGNORED",
        "INVALID_REPLY_TOKEN",
        "The inbound reply address token was invalid.",
      );
      return { status: "IGNORED" };
    }
    const terminal = receipt.attemptCount >= MAX_RECEIPT_ATTEMPTS;
    await completeReceipt(
      receipt,
      terminal ? "DEAD_LETTER" : "FAILED",
      "INBOUND_PROCESSING_FAILED",
      error instanceof Error ? error.message : "Unknown inbound processing error",
    );
    throw error;
  }
}

export async function recoverExpiredInboundReceiptLeases(
  now: Date = new Date(),
): Promise<string[]> {
  const orphanCutoff = new Date(now.getTime() - 2 * 60_000);
  return db.transaction(async (tx) => {
    const expired = await tx
      .update(inboundMessageReceipt)
      .set({
        status: "FAILED",
        claimToken: null,
        leaseExpiresAt: null,
        lastErrorCode: "PROCESSING_LEASE_EXPIRED",
        lastErrorMessage: "Inbound receipt processing lease expired.",
        updatedAt: now,
      })
      .where(
        and(
          eq(inboundMessageReceipt.status, "PROCESSING"),
          lt(inboundMessageReceipt.leaseExpiresAt, now),
        ),
      )
      .returning({ id: inboundMessageReceipt.id });

    const orphaned = await tx
      .select({ id: inboundMessageReceipt.id })
      .from(inboundMessageReceipt)
      .where(
        and(
          inArray(inboundMessageReceipt.status, ["PENDING", "FAILED"]),
          lt(inboundMessageReceipt.updatedAt, orphanCutoff),
          lt(inboundMessageReceipt.attemptCount, MAX_RECEIPT_ATTEMPTS),
        ),
      )
      .orderBy(inboundMessageReceipt.updatedAt, inboundMessageReceipt.id)
      .limit(100);

    return [
      ...new Set([
        ...expired.map((receipt) => receipt.id),
        ...orphaned.map((receipt) => receipt.id),
      ]),
    ];
  });
}
