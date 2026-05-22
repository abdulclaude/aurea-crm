import { channel, topic } from "@inngest/realtime";

export const BIRTHDAY_TRIGGER_CHANNEL_NAME = "birthday-trigger";

export const birthdayTriggerChannel = channel(
  BIRTHDAY_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
