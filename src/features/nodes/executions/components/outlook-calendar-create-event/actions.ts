"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookCalendarCreateEventChannel } from "@/inngest/channels/outlook-calendar-create-event";

export type OutlookCalendarCreateEventToken = Realtime.Token<
  typeof outlookCalendarCreateEventChannel,
  ["status"]
>;

export async function fetchOutlookCalendarCreateEventRealtimeToken(): Promise<OutlookCalendarCreateEventToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookCalendarCreateEventChannel(),
    topics: ["status"],
  });

  return token;
}
