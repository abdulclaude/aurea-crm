"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleFormReadResponsesChannel } from "@/inngest/channels/google-form-read-responses";

export type GoogleFormReadResponsesToken = Realtime.Token<
  typeof googleFormReadResponsesChannel,
  ["status"]
>;

export async function fetchGoogleFormReadResponsesRealtimeToken(): Promise<GoogleFormReadResponsesToken> {
  return getSubscriptionToken(inngest, {
    channel: googleFormReadResponsesChannel(),
    topics: ["status"],
  });
}
