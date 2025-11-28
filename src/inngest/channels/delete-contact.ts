import { channel, topic } from "@inngest/realtime";

export const DELETE_CONTACT_CHANNEL_NAME = "delete-contact-execution";

export const deleteContactChannel = channel(
  DELETE_CONTACT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
