"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookEmailDeletedChannel } from "@/inngest/channels/outlook-email-deleted";

export type OutlookEmailDeletedToken = Realtime.Token<
  typeof outlookEmailDeletedChannel,
  ["status"]
>;

export async function fetchOutlookEmailDeletedRealtimeToken(): Promise<OutlookEmailDeletedToken> {
  return getSubscriptionToken(inngest, {
    channel: outlookEmailDeletedChannel(),
    topics: ["status"],
  });
}
