import { channel, topic } from "@inngest/realtime";

export const STRIPE_CREATE_INVOICE_CHANNEL_NAME = "stripe-create-invoice-execution";

export const stripeCreateInvoiceChannel = channel(
  STRIPE_CREATE_INVOICE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
