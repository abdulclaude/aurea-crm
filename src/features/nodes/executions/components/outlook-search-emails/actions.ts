"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookSearchEmailsChannel } from "@/inngest/channels/outlook-search-emails";

export type OutlookSearchEmailsToken = Realtime.Token<
  typeof outlookSearchEmailsChannel,
  ["status"]
>;

export async function fetchOutlookSearchEmailsRealtimeToken(): Promise<OutlookSearchEmailsToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookSearchEmailsChannel(),
    topics: ["status"],
  });

  return token;
}
