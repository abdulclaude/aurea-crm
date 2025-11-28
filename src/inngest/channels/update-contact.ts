import { channel, topic } from "@inngest/realtime";

export const UPDATE_CONTACT_CHANNEL_NAME = "update-contact-execution";

export const updateContactChannel = channel(
  UPDATE_CONTACT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
