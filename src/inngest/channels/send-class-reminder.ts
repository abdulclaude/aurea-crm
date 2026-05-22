import { channel, topic } from "@inngest/realtime";

export const SEND_CLASS_REMINDER_CHANNEL_NAME = "send-class-reminder-execution";

export const sendClassReminderChannel = channel(
  SEND_CLASS_REMINDER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
