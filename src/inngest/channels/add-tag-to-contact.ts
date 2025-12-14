import { channel, topic } from "@inngest/realtime";

export const ADD_TAG_TO_CONTACT_CHANNEL_NAME = "add-tag-to-contact-execution";

export const addTagToContactChannel = channel(
  ADD_TAG_TO_CONTACT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
