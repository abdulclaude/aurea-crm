import { channel, topic } from "@inngest/realtime";

export const GMAIL_SEARCH_EMAILS_CHANNEL_NAME = "gmail-search-emails";

export const gmailSearchEmailsChannel = channel(GMAIL_SEARCH_EMAILS_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
