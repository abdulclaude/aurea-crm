import { channel, topic } from "@inngest/realtime";

export const CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME =
  "client-lifecycle-stage-changed-trigger";

export const clientLifecycleStageChangedTriggerChannel = channel(
  CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
