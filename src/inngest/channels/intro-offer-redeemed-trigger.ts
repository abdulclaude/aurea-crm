import { channel, topic } from "@inngest/realtime";

export const INTRO_OFFER_REDEEMED_TRIGGER_CHANNEL_NAME =
  "intro-offer-redeemed-trigger";

export const introOfferRedeemedTriggerChannel = channel(
  INTRO_OFFER_REDEEMED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
