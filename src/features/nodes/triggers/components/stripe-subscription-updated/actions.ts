"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripeSubscriptionUpdatedChannel } from "@/inngest/channels/stripe-subscription-updated";

export type StripeSubscriptionUpdatedToken = Realtime.Token<
  typeof stripeSubscriptionUpdatedChannel,
  ["status"]
>;

export async function fetchStripeSubscriptionUpdatedRealtimeToken(): Promise<StripeSubscriptionUpdatedToken> {
  return getSubscriptionToken(inngest, {
    channel: stripeSubscriptionUpdatedChannel(),
    topics: ["status"],
  });
}
