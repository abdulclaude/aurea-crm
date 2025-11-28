"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { oneDriveChannel } from "@/inngest/channels/onedrive";

export type OneDriveExecutionToken = Realtime.Token<
  typeof oneDriveChannel,
  ["status"]
>;

export async function fetchOneDriveRealtimeToken(): Promise<OneDriveExecutionToken> {
  return getSubscriptionToken(inngest, {
    channel: oneDriveChannel(),
    topics: ["status"],
  });
}
