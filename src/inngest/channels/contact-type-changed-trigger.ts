import { channel, topic } from "@inngest/realtime";

export const CONTACT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME =
  "contact-type-changed-trigger";

export const contactTypeChangedTriggerChannel = channel(
  CONTACT_TYPE_CHANGED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
