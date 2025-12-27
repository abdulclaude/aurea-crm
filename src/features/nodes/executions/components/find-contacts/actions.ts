"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { findContactsChannel } from "@/inngest/channels/find-contacts";

export type FindContactsToken = Realtime.Token<
  typeof findContactsChannel,
  ["status"]
>;

export async function fetchFindContactsRealtimeToken(): Promise<FindContactsToken> {
  return getSubscriptionToken(inngest, {
    channel: findContactsChannel(),
    topics: ["status"],
  });
}
