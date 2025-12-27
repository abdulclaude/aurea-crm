import { channel, topic } from "@inngest/realtime";

export const STRIPE_PAYMENT_SUCCEEDED_CHANNEL_NAME = "stripe-payment-succeeded-trigger";

export const stripePaymentSucceededChannel = channel(
  STRIPE_PAYMENT_SUCCEEDED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
