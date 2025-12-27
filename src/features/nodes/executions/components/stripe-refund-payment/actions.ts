"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripeRefundPaymentChannel } from "@/inngest/channels/stripe-refund-payment";

export type StripeRefundPaymentToken = Realtime.Token<
  typeof stripeRefundPaymentChannel,
  ["status"]
>;

export async function fetchStripeRefundPaymentRealtimeToken(): Promise<StripeRefundPaymentToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: stripeRefundPaymentChannel(),
    topics: ["status"],
  });

  return token;
}
