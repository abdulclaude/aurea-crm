"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookCalendarEventUpdatedChannel } from "@/inngest/channels/outlook-calendar-event-updated";

export type OutlookCalendarEventUpdatedToken = Realtime.Token<
  typeof outlookCalendarEventUpdatedChannel,
  ["status"]
>;

export async function fetchOutlookCalendarEventUpdatedRealtimeToken(): Promise<OutlookCalendarEventUpdatedToken> {
  return getSubscriptionToken(inngest, {
    channel: outlookCalendarEventUpdatedChannel(),
    topics: ["status"],
  });
}
