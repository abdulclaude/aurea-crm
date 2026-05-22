import { channel, topic } from "@inngest/realtime";

export const MEMBER_CLASS_COUNT_TRIGGER_CHANNEL_NAME =
  "member-class-count-trigger";

export const memberClassCountTriggerChannel = channel(
  MEMBER_CLASS_COUNT_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
