"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarTriggerChannel } from "@/inngest/channels/google-calendar-trigger";

export type GoogleCalendarTriggerToken = Realtime.Token<
  typeof googleCalendarTriggerChannel,
  ["status"]
>;

export async function fetchGoogleCalendarTriggerRealtimeToken(): Promise<GoogleCalendarTriggerToken> {
  return getSubscriptionToken(inngest, {
    channel: googleCalendarTriggerChannel(),
    topics: ["status"],
  });
}
