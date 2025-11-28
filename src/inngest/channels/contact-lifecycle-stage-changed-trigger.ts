import { channel, topic } from "@inngest/realtime";

export const CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME =
  "contact-lifecycle-stage-changed-trigger";

export const contactLifecycleStageChangedTriggerChannel = channel(
  CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
