import { channel, topic } from "@inngest/realtime";

export const STUDIO_PAYMENT_SUCCEEDED_TRIGGER_CHANNEL_NAME =
  "studio-payment-succeeded-trigger";

export const studioPaymentSucceededTriggerChannel = channel(
  STUDIO_PAYMENT_SUCCEEDED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
