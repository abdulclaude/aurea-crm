"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { geminiTransformChannel } from "@/inngest/channels/gemini-transform";

export type GeminiTransformToken = Realtime.Token<
  typeof geminiTransformChannel,
  ["status"]
>;

export async function fetchGeminiTransformRealtimeToken(): Promise<GeminiTransformToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: geminiTransformChannel(),
    topics: ["status"],
  });

  return token;
}
