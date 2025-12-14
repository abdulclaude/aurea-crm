import { channel, topic } from "@inngest/realtime";

export const DEAL_UPDATED_TRIGGER_CHANNEL_NAME = "deal-updated-trigger";

export const dealUpdatedTriggerChannel = channel(DEAL_UPDATED_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
