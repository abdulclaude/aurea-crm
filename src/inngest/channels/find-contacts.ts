import { channel, topic } from "@inngest/realtime";

export const FIND_CONTACTS_CHANNEL_NAME = "find-contacts";

export const findContactsChannel = channel(FIND_CONTACTS_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
