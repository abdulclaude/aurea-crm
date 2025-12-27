"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookCalendarEventCreatedChannel } from "@/inngest/channels/outlook-calendar-event-created";

export type OutlookCalendarEventCreatedToken = Realtime.Token<
  typeof outlookCalendarEventCreatedChannel,
  ["status"]
>;

export async function fetchOutlookCalendarEventCreatedRealtimeToken(): Promise<OutlookCalendarEventCreatedToken> {
  return getSubscriptionToken(inngest, {
    channel: outlookCalendarEventCreatedChannel(),
    topics: ["status"],
  });
}
