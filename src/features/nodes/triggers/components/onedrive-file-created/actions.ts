"use server";

import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { onedriveFileCreatedChannel } from "@/inngest/channels/onedrive-file-created";

export type OnedriveFileCreatedToken = Realtime.Token<
  typeof onedriveFileCreatedChannel,
  ["status"]
>;

export async function fetchOnedriveFileCreatedRealtimeToken(): Promise<OnedriveFileCreatedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: onedriveFileCreatedChannel(),
    topics: ["status"],
  });

  return token;
}
