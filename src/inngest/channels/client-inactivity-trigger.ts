import { channel, topic } from "@inngest/realtime";

export const CLIENT_INACTIVITY_TRIGGER_CHANNEL_NAME =
  "client-inactivity-trigger";

export const clientInactivityTriggerChannel = channel(
  CLIENT_INACTIVITY_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
