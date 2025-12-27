import { channel, topic } from "@inngest/realtime";

export const STRIPE_SUBSCRIPTION_UPDATED_CHANNEL_NAME = "stripe-subscription-updated-trigger";

export const stripeSubscriptionUpdatedChannel = channel(
  STRIPE_SUBSCRIPTION_UPDATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
