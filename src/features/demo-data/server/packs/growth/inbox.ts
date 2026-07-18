import type { CommunicationFixtures, GrowthBuildScope, GrowthPackFixtures } from "./types";
import { before, safeEmail, safePhone, sha256 } from "./shared";

type InboxFixtures = Pick<
  CommunicationFixtures,
  "routes" | "conversations" | "receipts" | "messages" | "smsConfigs" | "smsMessages"
>;

export function buildInboxFixtures(
  scope: GrowthBuildScope,
  providerIds: { resendProviderId: string; smsProviderId: string },
): InboxFixtures {
  const { context, clients, id, metadata } = scope;
  const { organizationId, locationId, actorUserId, referenceDate, runId } = context;
  const { resendProviderId, smsProviderId } = providerIds;
const emailRouteId = id("inbox-route", "email");
const smsRouteId = id("inbox-route", "sms");
const routes: GrowthPackFixtures["routes"] = [
  {
    id: emailRouteId,
    organizationId,
    locationId,
    providerAccountId: resendProviderId,
    channel: "EMAIL",
    name: "Demo email inbox",
    inboundAddress: "inbox@demo.invalid",
    inboundAddressNormalized: "inbox@demo.invalid",
    isDefault: false,
    isActive: false,
    createdByUserId: actorUserId,
    updatedAt: referenceDate,
  },
  {
    id: smsRouteId,
    organizationId,
    locationId,
    providerAccountId: smsProviderId,
    channel: "SMS",
    name: "Demo SMS inbox",
    inboundAddress: "+447700900000",
    inboundAddressNormalized: "+447700900000",
    isDefault: false,
    isActive: false,
    createdByUserId: actorUserId,
    updatedAt: referenceDate,
  },
];
const conversations: GrowthPackFixtures["conversations"] = [];
const receipts: GrowthPackFixtures["receipts"] = [];
const messages: GrowthPackFixtures["messages"] = [];
const conversationCount = context.profile === "QA_EXHAUSTIVE" ? 72 : 36;
const subjects = [
  "First class recommendations",
  "Membership question",
  "Rescheduling a session",
  "Returning after a break",
  "Accessibility at the studio",
  "Intro offer details",
];
for (let index = 0; index < conversationCount; index += 1) {
  const client = clients[index % clients.length] ?? clients[0];
  if (!client) throw new Error("An inbox client was not available.");
  const channel = index % 5 === 0 ? "SMS" : index % 7 === 0 ? "APP" : "EMAIL";
  const routeId = channel === "EMAIL" ? emailRouteId : channel === "SMS" ? smsRouteId : undefined;
  const providerId = channel === "EMAIL" ? resendProviderId : channel === "SMS" ? smsProviderId : undefined;
  const createdAt = before(referenceDate, (index % 45) + 1, index % 12);
  const conversationId = id("conversation", index);
  const inboundReceiptId = providerId ? id("inbound-receipt", index) : undefined;
  const inboundAt = new Date(createdAt.getTime() + 2 * 60_000);
  const outboundAt = new Date(createdAt.getTime() + 55 * 60_000);
  const followUpAt = new Date(createdAt.getTime() + 20 * 3_600_000);
  const hasFollowUp = index % 3 === 0;
  conversations.push({
    id: conversationId,
    organizationId,
    locationId,
    clientId: client.id,
    routeId,
    channel,
    status: index % 6 === 0 ? "SNOOZED" : index % 4 === 0 ? "DONE" : "OPEN",
    subject: subjects[index % subjects.length],
    isRead: index % 3 !== 0,
    lastMessageAt: hasFollowUp ? followUpAt : outboundAt,
    createdAt,
    updatedAt: hasFollowUp ? followUpAt : outboundAt,
  });
  if (inboundReceiptId && providerId) {
    receipts.push({
      id: inboundReceiptId,
      organizationId,
      locationId,
      routeId,
      providerAccountId: providerId,
      provider: channel === "EMAIL" ? "RESEND" : "TWILIO",
      providerEventId: `demo-event-${runId}-${index}`,
      providerMessageId: `demo-message-${runId}-${index}`,
      eventType: "message.received",
      status: index % 13 === 0 ? "IGNORED" : "PROCESSED",
      payloadHash: sha256(`${runId}:inbound:${index}`),
      safeMetadata: metadata({ channel, synthetic: true }),
      attemptCount: 1,
      occurredAt: inboundAt,
      receivedAt: inboundAt,
      processedAt: new Date(inboundAt.getTime() + 1_000),
      createdAt: inboundAt,
      updatedAt: inboundAt,
    });
  }
  messages.push(
    {
      id: id(`conversation-${index}-message`, 0),
      conversationId,
      direction: "INBOUND",
      content: `Hi, I have a question about ${subjects[index % subjects.length]?.toLowerCase() ?? "the studio"}.`,
      isRead: index % 3 !== 0,
      providerAccountId: providerId,
      inboundReceiptId,
      externalMessageId: providerId ? `demo-message-${runId}-${index}` : undefined,
      externalThreadId: `demo-thread-${runId}-${index}`,
      fromAddress: channel === "SMS" ? safePhone(client, index) : safeEmail(client, index),
      toAddress: channel === "SMS" ? "+447700900000" : "inbox@demo.invalid",
      subject: subjects[index % subjects.length],
      createdAt: inboundAt,
    },
    {
      id: id(`conversation-${index}-message`, 1),
      conversationId,
      direction: "OUTBOUND",
      content: "Thanks for getting in touch. Here is a clear next step based on your goals.",
      isRead: true,
      senderUserId: actorUserId,
      providerAccountId: providerId,
      externalThreadId: `demo-thread-${runId}-${index}`,
      fromAddress: channel === "SMS" ? "+447700900000" : "inbox@demo.invalid",
      toAddress: channel === "SMS" ? safePhone(client, index) : safeEmail(client, index),
      subject: subjects[index % subjects.length],
      createdAt: outboundAt,
    },
  );
  if (hasFollowUp) {
    messages.push({
      id: id(`conversation-${index}-message`, 2),
      conversationId,
      direction: "INBOUND",
      content: "That helps, thank you. I will book the recommended session.",
      isRead: index % 2 === 0,
      providerAccountId: providerId,
      externalThreadId: `demo-thread-${runId}-${index}`,
      fromAddress: channel === "SMS" ? safePhone(client, index) : safeEmail(client, index),
      toAddress: channel === "SMS" ? "+447700900000" : "inbox@demo.invalid",
      subject: subjects[index % subjects.length],
      createdAt: followUpAt,
    });
  }
}

const smsConfigId = id("sms-config", 0);
const smsConfigs: GrowthPackFixtures["smsConfigs"] = [
  {
    id: smsConfigId,
    organizationId,
    locationId,
    providerAccountId: smsProviderId,
    fromNumber: "+447700900000",
    isActive: false,
    monthlyLimit: 5_000,
    sentThisMonth: 0,
    lastResetAt: referenceDate,
    updatedAt: referenceDate,
  },
];
const smsMessages: GrowthPackFixtures["smsMessages"] = [];
const smsCount = context.profile === "QA_EXHAUSTIVE" ? 120 : 60;
for (let index = 0; index < smsCount; index += 1) {
  const client = clients[index % clients.length] ?? clients[0];
  if (!client) throw new Error("An SMS client was not available.");
  const direction = index % 4 === 0 ? "INBOUND" : "OUTBOUND";
  const status = index % 11 === 0 ? "FAILED" : index % 7 === 0 ? "UNDELIVERED" : index % 3 === 0 ? "SENT" : "DELIVERED";
  const createdAt = before(referenceDate, (index % 100) + 1, index % 8);
  smsMessages.push({
    id: id("sms-message", index),
    organizationId,
    locationId,
    clientId: client.id,
    to: direction === "OUTBOUND" ? safePhone(client, index) : "+447700900000",
    from: direction === "OUTBOUND" ? "+447700900000" : safePhone(client, index),
    body: direction === "OUTBOUND" ? "Demo reminder: your studio session is tomorrow." : "Thanks, I will be there.",
    direction,
    status,
    providerSid: `demo-sms-${runId}-${index}`,
    errorCode: status === "FAILED" || status === "UNDELIVERED" ? "DEMO_TERMINAL" : undefined,
    errorMessage: status === "FAILED" || status === "UNDELIVERED" ? "Synthetic terminal outcome" : undefined,
    sentAt: status !== "FAILED" ? createdAt : undefined,
    deliveredAt: status === "DELIVERED" ? new Date(createdAt.getTime() + 30_000) : undefined,
    createdAt,
  });
}


  return { routes, conversations, receipts, messages, smsConfigs, smsMessages };
}
