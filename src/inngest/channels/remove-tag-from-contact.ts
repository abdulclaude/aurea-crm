import { channel, topic } from "@inngest/realtime";

export const REMOVE_TAG_FROM_CONTACT_CHANNEL_NAME = "remove-tag-from-contact-execution";

export const removeTagFromContactChannel = channel(
  REMOVE_TAG_FROM_CONTACT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
