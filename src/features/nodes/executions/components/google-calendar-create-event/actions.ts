"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarCreateEventChannel } from "@/inngest/channels/google-calendar-create-event";

export type GoogleCalendarCreateEventToken = Realtime.Token<
  typeof googleCalendarCreateEventChannel,
  ["status"]
>;

export async function fetchGoogleCalendarCreateEventRealtimeToken(): Promise<GoogleCalendarCreateEventToken> {
  return getSubscriptionToken(inngest, {
    channel: googleCalendarCreateEventChannel(),
    topics: ["status"],
  });
}
