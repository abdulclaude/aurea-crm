import { channel, topic } from "@inngest/realtime";

export const CONTACT_UPDATED_TRIGGER_CHANNEL_NAME = "contact-updated-trigger";

export const contactUpdatedTriggerChannel = channel(
  CONTACT_UPDATED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
