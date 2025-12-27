import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_EMAIL_DELETED_CHANNEL_NAME = "outlook-email-deleted-trigger";

export const outlookEmailDeletedChannel = channel(
  OUTLOOK_EMAIL_DELETED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
