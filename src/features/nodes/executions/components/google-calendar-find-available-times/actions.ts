"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleCalendarFindAvailableTimesChannel } from "@/inngest/channels/google-calendar-find-available-times";

export type GoogleCalendarFindAvailableTimesToken = Realtime.Token<
  typeof googleCalendarFindAvailableTimesChannel,
  ["status"]
>;

export async function fetchGoogleCalendarFindAvailableTimesRealtimeToken(): Promise<GoogleCalendarFindAvailableTimesToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleCalendarFindAvailableTimesChannel(),
    topics: ["status"],
  });

  return token;
}
