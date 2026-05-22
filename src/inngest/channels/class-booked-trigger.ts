import { channel, topic } from "@inngest/realtime";

export const CLASS_BOOKED_TRIGGER_CHANNEL_NAME = "class-booked-trigger";

export const classBookedTriggerChannel = channel(
  CLASS_BOOKED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
