import { channel, topic } from "@inngest/realtime";

export const MEMBER_NO_SHOW_TRIGGER_CHANNEL_NAME = "member-no-show-trigger";

export const memberNoShowTriggerChannel = channel(
  MEMBER_NO_SHOW_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
