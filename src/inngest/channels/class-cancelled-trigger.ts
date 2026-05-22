import { channel, topic } from "@inngest/realtime";

export const CLASS_CANCELLED_TRIGGER_CHANNEL_NAME = "class-cancelled-trigger";

export const classCancelledTriggerChannel = channel(
  CLASS_CANCELLED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
