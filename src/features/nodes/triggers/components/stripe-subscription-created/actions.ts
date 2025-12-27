"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripeSubscriptionCreatedChannel } from "@/inngest/channels/stripe-subscription-created";

export type StripeSubscriptionCreatedToken = Realtime.Token<
  typeof stripeSubscriptionCreatedChannel,
  ["status"]
>;

export async function fetchStripeSubscriptionCreatedRealtimeToken(): Promise<StripeSubscriptionCreatedToken> {
  return getSubscriptionToken(inngest, {
    channel: stripeSubscriptionCreatedChannel(),
    topics: ["status"],
  });
}
