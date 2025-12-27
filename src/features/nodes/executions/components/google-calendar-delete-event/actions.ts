"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarDeleteEventChannel } from "@/inngest/channels/google-calendar-delete-event";

export type GoogleCalendarDeleteEventToken = Realtime.Token<
  typeof googleCalendarDeleteEventChannel,
  ["status"]
>;

export async function fetchGoogleCalendarDeleteEventRealtimeToken(): Promise<GoogleCalendarDeleteEventToken> {
  return getSubscriptionToken(inngest, {
    channel: googleCalendarDeleteEventChannel(),
    topics: ["status"],
  });
}
