"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

import { inngest } from "@/inngest/client";
import { whatsappTriggerChannel } from "@/inngest/channels/whatsapp-trigger";

export type WhatsAppTriggerRealtimeToken = Realtime.Token<
  typeof whatsappTriggerChannel,
  ["status"]
>;

export async function fetchWhatsAppTriggerRealtimeToken(): Promise<WhatsAppTriggerRealtimeToken> {
  return getSubscriptionToken(inngest, {
    channel: whatsappTriggerChannel(),
    topics: ["status"],
  });
}

