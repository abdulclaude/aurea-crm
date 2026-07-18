import { channel, topic } from "@inngest/realtime";

export const PRICING_OPTION_PURCHASED_TRIGGER_CHANNEL_NAME =
  "pricing-option-purchased-trigger";

export const pricingOptionPurchasedTriggerChannel = channel(
  PRICING_OPTION_PURCHASED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
