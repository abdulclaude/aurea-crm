import { channel, topic } from "@inngest/realtime";

export const MEMBERSHIP_CANCELLED_TRIGGER_CHANNEL_NAME = "membership-cancelled-trigger";

export const membershipCancelledTriggerChannel = channel(
  MEMBERSHIP_CANCELLED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
