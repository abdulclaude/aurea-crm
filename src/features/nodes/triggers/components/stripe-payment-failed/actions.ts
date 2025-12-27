"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripePaymentFailedChannel } from "@/inngest/channels/stripe-payment-failed";

export type StripePaymentFailedToken = Realtime.Token<
  typeof stripePaymentFailedChannel,
  ["status"]
>;

export async function fetchStripePaymentFailedRealtimeToken(): Promise<StripePaymentFailedToken> {
  return getSubscriptionToken(inngest, {
    channel: stripePaymentFailedChannel(),
    topics: ["status"],
  });
}
