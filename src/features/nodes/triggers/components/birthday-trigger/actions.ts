"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

import { inngest } from "@/inngest/client";
import { birthdayTriggerChannel } from "@/inngest/channels/birthday-trigger";

export type BirthdayTriggerToken = Realtime.Token<
  typeof birthdayTriggerChannel,
  ["status"]
>;

export async function fetchBirthdayTriggerRealtimeToken(): Promise<BirthdayTriggerToken> {
  return getSubscriptionToken(inngest, {
    channel: birthdayTriggerChannel(),
    topics: ["status"],
  });
}
