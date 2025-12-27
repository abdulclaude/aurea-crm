import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_MOVE_EMAIL_CHANNEL_NAME = "outlook-move-email-execution";

export const outlookMoveEmailChannel = channel(
  OUTLOOK_MOVE_EMAIL_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
