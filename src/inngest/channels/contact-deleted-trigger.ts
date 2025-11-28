import { channel, topic } from "@inngest/realtime";

export const CONTACT_DELETED_TRIGGER_CHANNEL_NAME = "contact-deleted-trigger";

export const contactDeletedTriggerChannel = channel(
  CONTACT_DELETED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
