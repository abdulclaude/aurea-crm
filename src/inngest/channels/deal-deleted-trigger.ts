import { channel, topic } from "@inngest/realtime";

export const DEAL_DELETED_TRIGGER_CHANNEL_NAME = "deal-deleted-trigger";

export const dealDeletedTriggerChannel = channel(DEAL_DELETED_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
