import { channel, topic } from "@inngest/realtime";

export const STRIPE_CREATE_CHECKOUT_SESSION_CHANNEL_NAME = "stripe-create-checkout-session-execution";

export const stripeCreateCheckoutSessionChannel = channel(
  STRIPE_CREATE_CHECKOUT_SESSION_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
