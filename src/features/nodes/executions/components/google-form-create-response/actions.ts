"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleFormCreateResponseChannel } from "@/inngest/channels/google-form-create-response";

export type GoogleFormCreateResponseToken = Realtime.Token<
  typeof googleFormCreateResponseChannel,
  ["status"]
>;

export async function fetchGoogleFormCreateResponseRealtimeToken(): Promise<GoogleFormCreateResponseToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleFormCreateResponseChannel(),
    topics: ["status"],
  });

  return token;
}
