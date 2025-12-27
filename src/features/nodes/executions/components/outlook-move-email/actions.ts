"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { outlookMoveEmailChannel } from "@/inngest/channels/outlook-move-email";

export type OutlookMoveEmailToken = Realtime.Token<
  typeof outlookMoveEmailChannel,
  ["status"]
>;

export async function fetchOutlookMoveEmailRealtimeToken(): Promise<OutlookMoveEmailToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookMoveEmailChannel(),
    topics: ["status"],
  });

  return token;
}
