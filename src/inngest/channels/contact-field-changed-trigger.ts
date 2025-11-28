import { channel, topic } from "@inngest/realtime";

export const CONTACT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME =
  "contact-field-changed-trigger";

export const contactFieldChangedTriggerChannel = channel(
  CONTACT_FIELD_CHANGED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
