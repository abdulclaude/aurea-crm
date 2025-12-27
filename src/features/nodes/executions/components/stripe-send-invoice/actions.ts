"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { stripeSendInvoiceChannel } from "@/inngest/channels/stripe-send-invoice";

export type StripeSendInvoiceToken = Realtime.Token<
  typeof stripeSendInvoiceChannel,
  ["status"]
>;

export async function fetchStripeSendInvoiceRealtimeToken(): Promise<StripeSendInvoiceToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: stripeSendInvoiceChannel(),
    topics: ["status"],
  });

  return token;
}
