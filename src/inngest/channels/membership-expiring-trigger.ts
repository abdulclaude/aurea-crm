import { channel, topic } from "@inngest/realtime";

export const MEMBERSHIP_EXPIRING_TRIGGER_CHANNEL_NAME = "membership-expiring-trigger";

export const membershipExpiringTriggerChannel = channel(
  MEMBERSHIP_EXPIRING_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
