"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { geminiClassifyChannel } from "@/inngest/channels/gemini-classify";

export type GeminiClassifyToken = Realtime.Token<
  typeof geminiClassifyChannel,
  ["status"]
>;

export async function fetchGeminiClassifyRealtimeToken(): Promise<GeminiClassifyToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: geminiClassifyChannel(),
    topics: ["status"],
  });

  return token;
}
