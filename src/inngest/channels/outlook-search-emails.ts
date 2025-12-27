import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_SEARCH_EMAILS_CHANNEL_NAME = "outlook-search-emails-execution";

export const outlookSearchEmailsChannel = channel(
  OUTLOOK_SEARCH_EMAILS_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
