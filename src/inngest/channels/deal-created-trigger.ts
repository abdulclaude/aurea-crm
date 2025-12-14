import { channel, topic } from "@inngest/realtime";

export const DEAL_CREATED_TRIGGER_CHANNEL_NAME = "deal-created-trigger";

export const dealCreatedTriggerChannel = channel(DEAL_CREATED_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
