"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { addDealNoteChannel } from "@/inngest/channels/add-deal-note";

export type AddDealNoteToken = Realtime.Token<
  typeof addDealNoteChannel,
  ["status"]
>;

export async function fetchAddDealNoteRealtimeToken(): Promise<AddDealNoteToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: addDealNoteChannel(),
    topics: ["status"],
  });

  return token;
}
