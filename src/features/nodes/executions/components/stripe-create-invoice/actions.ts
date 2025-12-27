"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripeCreateInvoiceChannel } from "@/inngest/channels/stripe-create-invoice";

export type StripeCreateInvoiceToken = Realtime.Token<
  typeof stripeCreateInvoiceChannel,
  ["status"]
>;

export async function fetchStripeCreateInvoiceRealtimeToken(): Promise<StripeCreateInvoiceToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: stripeCreateInvoiceChannel(),
    topics: ["status"],
  });

  return token;
}
