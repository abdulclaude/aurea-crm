import { channel, topic } from "@inngest/realtime";

export const STUDIO_PAYMENT_FAILED_TRIGGER_CHANNEL_NAME =
  "studio-payment-failed-trigger";

export const studioPaymentFailedTriggerChannel = channel(
  STUDIO_PAYMENT_FAILED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
