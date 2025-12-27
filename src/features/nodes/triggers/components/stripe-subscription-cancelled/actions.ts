"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripeSubscriptionCancelledChannel } from "@/inngest/channels/stripe-subscription-cancelled";

export type StripeSubscriptionCancelledToken = Realtime.Token<
  typeof stripeSubscriptionCancelledChannel,
  ["status"]
>;

export async function fetchStripeSubscriptionCancelledRealtimeToken(): Promise<StripeSubscriptionCancelledToken> {
  return getSubscriptionToken(inngest, {
    channel: stripeSubscriptionCancelledChannel(),
    topics: ["status"],
  });
}
