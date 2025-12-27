"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { geminiGenerateTextChannel } from "@/inngest/channels/gemini-generate-text";

export type GeminiGenerateTextToken = Realtime.Token<
  typeof geminiGenerateTextChannel,
  ["status"]
>;

export async function fetchGeminiGenerateTextRealtimeToken(): Promise<GeminiGenerateTextToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: geminiGenerateTextChannel(),
    topics: ["status"],
  });

  return token;
}
