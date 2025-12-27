"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarEventUpdatedChannel } from "@/inngest/channels/google-calendar-event-updated";

export type GoogleCalendarEventUpdatedToken = Realtime.Token<
  typeof googleCalendarEventUpdatedChannel,
  ["status"]
>;

export async function fetchGoogleCalendarEventUpdatedRealtimeToken(): Promise<GoogleCalendarEventUpdatedToken> {
  return getSubscriptionToken(inngest, {
    channel: googleCalendarEventUpdatedChannel(),
    topics: ["status"],
  });
}
