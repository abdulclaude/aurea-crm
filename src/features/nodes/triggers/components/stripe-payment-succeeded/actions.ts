"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripePaymentSucceededChannel } from "@/inngest/channels/stripe-payment-succeeded";

export type StripePaymentSucceededToken = Realtime.Token<
  typeof stripePaymentSucceededChannel,
  ["status"]
>;

export async function fetchStripePaymentSucceededRealtimeToken(): Promise<StripePaymentSucceededToken> {
  return getSubscriptionToken(inngest, {
    channel: stripePaymentSucceededChannel(),
    topics: ["status"],
  });
}
