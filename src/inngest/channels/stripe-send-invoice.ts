import { channel, topic } from "@inngest/realtime";

export const STRIPE_SEND_INVOICE_CHANNEL_NAME = "stripe-send-invoice-execution";

export const stripeSendInvoiceChannel = channel(
  STRIPE_SEND_INVOICE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
