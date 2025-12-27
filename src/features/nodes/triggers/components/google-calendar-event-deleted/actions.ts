"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarEventDeletedChannel } from "@/inngest/channels/google-calendar-event-deleted";

export type GoogleCalendarEventDeletedToken = Realtime.Token<
  typeof googleCalendarEventDeletedChannel,
  ["status"]
>;

export async function fetchGoogleCalendarEventDeletedRealtimeToken(): Promise<GoogleCalendarEventDeletedToken> {
  return getSubscriptionToken(inngest, {
    channel: googleCalendarEventDeletedChannel(),
    topics: ["status"],
  });
}
