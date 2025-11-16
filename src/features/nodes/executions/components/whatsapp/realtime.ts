"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

import { inngest } from "@/inngest/client";
import { whatsappChannel } from "@/inngest/channels/whatsapp";

export type WhatsAppExecutionRealtimeToken = Realtime.Token<
  typeof whatsappChannel,
  ["status"]
>;

export async function fetchWhatsAppExecutionRealtimeToken(): Promise<WhatsAppExecutionRealtimeToken> {
  return getSubscriptionToken(inngest, {
    channel: whatsappChannel(),
    topics: ["status"],
  });
}

