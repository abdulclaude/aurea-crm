import { channel, topic } from "@inngest/realtime";

export const STRIPE_SUBSCRIPTION_CREATED_CHANNEL_NAME = "stripe-subscription-created-trigger";

export const stripeSubscriptionCreatedChannel = channel(
  STRIPE_SUBSCRIPTION_CREATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
