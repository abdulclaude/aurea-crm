import { channel, topic } from "@inngest/realtime";

export const STRIPE_PAYMENT_FAILED_CHANNEL_NAME = "stripe-payment-failed-trigger";

export const stripePaymentFailedChannel = channel(
  STRIPE_PAYMENT_FAILED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
