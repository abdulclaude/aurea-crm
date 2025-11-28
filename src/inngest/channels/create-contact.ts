import { channel, topic } from "@inngest/realtime";

export const CREATE_CONTACT_CHANNEL_NAME = "create-contact-execution";

export const createContactChannel = channel(
  CREATE_CONTACT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
