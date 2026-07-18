import { channel, topic } from "@inngest/realtime";

export const REFERRAL_CONVERTED_TRIGGER_CHANNEL_NAME =
  "referral-converted-trigger";

export const referralConvertedTriggerChannel = channel(
  REFERRAL_CONVERTED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
