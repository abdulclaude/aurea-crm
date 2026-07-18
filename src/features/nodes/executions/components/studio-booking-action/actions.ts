"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

import { inngest } from "@/inngest/client";
import { studioBookingActionChannel } from "@/inngest/channels/studio-booking-action";

export type StudioBookingActionToken = Realtime.Token<
  typeof studioBookingActionChannel,
  ["status"]
>;

export async function fetchStudioBookingActionRealtimeToken(): Promise<StudioBookingActionToken> {
  return getSubscriptionToken(inngest, {
    channel: studioBookingActionChannel(),
    topics: ["status"],
  });
}
