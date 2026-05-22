"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { findClientsChannel } from "@/inngest/channels/find-clients";

export type FindClientsToken = Realtime.Token<
  typeof findClientsChannel,
  ["status"]
>;

export async function fetchFindClientsRealtimeToken(): Promise<FindClientsToken> {
  return getSubscriptionToken(inngest, {
    channel: findClientsChannel(),
    topics: ["status"],
  });
}
