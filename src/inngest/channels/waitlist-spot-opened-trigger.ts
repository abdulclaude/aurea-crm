import { channel, topic } from "@inngest/realtime";

export const WAITLIST_SPOT_OPENED_TRIGGER_CHANNEL_NAME =
  "waitlist-spot-opened-trigger";

export const waitlistSpotOpenedTriggerChannel = channel(
  WAITLIST_SPOT_OPENED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
