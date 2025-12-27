"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookCalendarUpdateEventChannel } from "@/inngest/channels/outlook-calendar-update-event";

export type OutlookCalendarUpdateEventToken = Realtime.Token<
  typeof outlookCalendarUpdateEventChannel,
  ["status"]
>;

export async function fetchOutlookCalendarUpdateEventRealtimeToken(): Promise<OutlookCalendarUpdateEventToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookCalendarUpdateEventChannel(),
    topics: ["status"],
  });

  return token;
}
