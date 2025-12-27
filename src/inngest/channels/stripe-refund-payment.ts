import { channel, topic } from "@inngest/realtime";

export const STRIPE_REFUND_PAYMENT_CHANNEL_NAME = "stripe-refund-payment-execution";

export const stripeRefundPaymentChannel = channel(
  STRIPE_REFUND_PAYMENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
