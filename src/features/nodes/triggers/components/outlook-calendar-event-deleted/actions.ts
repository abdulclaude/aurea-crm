"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookCalendarEventDeletedChannel } from "@/inngest/channels/outlook-calendar-event-deleted";

export type OutlookCalendarEventDeletedToken = Realtime.Token<
  typeof outlookCalendarEventDeletedChannel,
  ["status"]
>;

export async function fetchOutlookCalendarEventDeletedRealtimeToken(): Promise<OutlookCalendarEventDeletedToken> {
  return getSubscriptionToken(inngest, {
    channel: outlookCalendarEventDeletedChannel(),
    topics: ["status"],
  });
}
