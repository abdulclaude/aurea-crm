import { channel, topic } from "@inngest/realtime";

export const GMAIL_ADD_LABEL_CHANNEL_NAME = "gmail-add-label";

export const gmailAddLabelChannel = channel(GMAIL_ADD_LABEL_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
