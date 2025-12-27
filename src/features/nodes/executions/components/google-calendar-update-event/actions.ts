"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarUpdateEventChannel } from "@/inngest/channels/google-calendar-update-event";

export type GoogleCalendarUpdateEventToken = Realtime.Token<
  typeof googleCalendarUpdateEventChannel,
  ["status"]
>;

export async function fetchGoogleCalendarUpdateEventRealtimeToken(): Promise<GoogleCalendarUpdateEventToken> {
  return getSubscriptionToken(inngest, {
    channel: googleCalendarUpdateEventChannel(),
    topics: ["status"],
  });
}
