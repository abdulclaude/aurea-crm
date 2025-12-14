import { channel, topic } from "@inngest/realtime";

export const DEAL_STAGE_CHANGED_TRIGGER_CHANNEL_NAME = "deal-stage-changed-trigger";

export const dealStageChangedTriggerChannel = channel(DEAL_STAGE_CHANGED_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
