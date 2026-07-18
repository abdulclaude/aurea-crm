import { createHash, createHmac } from "node:crypto";

import { normalizeEmailDestination } from "@/features/delivery/lib/normalization";

const TOKEN_VERSION = "v1";
const TOKEN_PATTERN = /^v1\.([a-f0-9]{32})$/;

export function createConversationReplyToken(input: {
  conversationId: string;
  secret: string;
}): string {
  const signature = createHmac("sha256", input.secret)
    .update(`${TOKEN_VERSION}:${input.conversationId}`)
    .digest("hex")
    .slice(0, 32);
  return `${TOKEN_VERSION}.${signature}`;
}

export function hashConversationReplyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildConversationReplyAddress(input: {
  inboundAddress: string;
  conversationId: string;
  secret: string;
}): string {
  const normalized = normalizeEmailDestination(input.inboundAddress);
  const separator = normalized.lastIndexOf("@");
  const localPart = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  const token = createConversationReplyToken({
    conversationId: input.conversationId,
    secret: input.secret,
  });
  return `${localPart}+${token}@${domain}`;
}

export function parseConversationReplyAddress(input: {
  recipient: string;
  inboundAddress: string;
}):
  | { kind: "EXACT" }
  | { kind: "CONVERSATION"; routingToken: string }
  | { kind: "INVALID_TOKEN" }
  | { kind: "NO_MATCH" } {
  const recipient = normalizeEmailDestination(input.recipient);
  const inboundAddress = normalizeEmailDestination(input.inboundAddress);
  if (recipient === inboundAddress) {
    return { kind: "EXACT" };
  }

  const separator = inboundAddress.lastIndexOf("@");
  const localPart = inboundAddress.slice(0, separator);
  const domain = inboundAddress.slice(separator + 1);
  const prefix = `${localPart}+`;
  const recipientSeparator = recipient.lastIndexOf("@");
  if (
    recipientSeparator < 0 ||
    recipient.slice(recipientSeparator + 1) !== domain ||
    !recipient.slice(0, recipientSeparator).startsWith(prefix)
  ) {
    return { kind: "NO_MATCH" };
  }

  const token = recipient.slice(prefix.length, recipientSeparator);
  const match = TOKEN_PATTERN.exec(token);
  return match
    ? { kind: "CONVERSATION", routingToken: token }
    : { kind: "INVALID_TOKEN" };
}
