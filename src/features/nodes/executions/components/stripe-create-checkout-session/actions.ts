"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripeCreateCheckoutSessionChannel } from "@/inngest/channels/stripe-create-checkout-session";

export type StripeCreateCheckoutSessionToken = Realtime.Token<
  typeof stripeCreateCheckoutSessionChannel,
  ["status"]
>;

export async function fetchStripeCreateCheckoutSessionRealtimeToken(): Promise<StripeCreateCheckoutSessionToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: stripeCreateCheckoutSessionChannel(),
    topics: ["status"],
  });

  return token;
}
