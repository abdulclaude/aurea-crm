import { channel, topic } from "@inngest/realtime";

export const INTRO_OFFER_COMPLETED_TRIGGER_CHANNEL_NAME =
  "intro-offer-completed-trigger";

export const introOfferCompletedTriggerChannel = channel(
  INTRO_OFFER_COMPLETED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
