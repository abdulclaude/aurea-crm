import { channel, topic } from "@inngest/realtime";

export const STRIPE_SUBSCRIPTION_CANCELLED_CHANNEL_NAME = "stripe-subscription-cancelled-trigger";

export const stripeSubscriptionCancelledChannel = channel(
  STRIPE_SUBSCRIPTION_CANCELLED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
