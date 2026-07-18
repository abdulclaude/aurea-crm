import "server-only";

export function getInboxReplyRoutingSecret(): string {
  const secret =
    process.env.INBOX_REPLY_ROUTING_SECRET ?? process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "INBOX_REPLY_ROUTING_SECRET must be configured with at least 32 characters.",
    );
  }
  return secret;
}
