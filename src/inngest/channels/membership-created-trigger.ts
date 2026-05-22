import { channel, topic } from "@inngest/realtime";

export const MEMBERSHIP_CREATED_TRIGGER_CHANNEL_NAME = "membership-created-trigger";

export const membershipCreatedTriggerChannel = channel(
  MEMBERSHIP_CREATED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
