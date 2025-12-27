"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookCalendarDeleteEventChannel } from "@/inngest/channels/outlook-calendar-delete-event";

export type OutlookCalendarDeleteEventToken = Realtime.Token<
  typeof outlookCalendarDeleteEventChannel,
  ["status"]
>;

export async function fetchOutlookCalendarDeleteEventRealtimeToken(): Promise<OutlookCalendarDeleteEventToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookCalendarDeleteEventChannel(),
    topics: ["status"],
  });

  return token;
}
