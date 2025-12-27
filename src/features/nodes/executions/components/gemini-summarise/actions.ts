"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { geminiSummariseChannel } from "@/inngest/channels/gemini-summarise";

export type GeminiSummariseToken = Realtime.Token<
  typeof geminiSummariseChannel,
  ["status"]
>;

export async function fetchGeminiSummariseRealtimeToken(): Promise<GeminiSummariseToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: geminiSummariseChannel(),
    topics: ["status"],
  });

  return token;
}
