"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarEventCreatedChannel } from "@/inngest/channels/google-calendar-event-created";

export type GoogleCalendarEventCreatedToken = Realtime.Token<
  typeof googleCalendarEventCreatedChannel,
  ["status"]
>;

export async function fetchGoogleCalendarEventCreatedRealtimeToken(): Promise<GoogleCalendarEventCreatedToken> {
  return getSubscriptionToken(inngest, {
    channel: googleCalendarEventCreatedChannel(),
    topics: ["status"],
  });
}
