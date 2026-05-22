import { channel, topic } from "@inngest/realtime";

export const MEMBER_CHECKED_IN_TRIGGER_CHANNEL_NAME = "member-checked-in-trigger";

export const memberCheckedInTriggerChannel = channel(
  MEMBER_CHECKED_IN_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
