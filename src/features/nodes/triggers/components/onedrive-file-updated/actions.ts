"use server";

import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { onedriveFileUpdatedChannel } from "@/inngest/channels/onedrive-file-updated";

export type OnedriveFileUpdatedToken = Realtime.Token<
  typeof onedriveFileUpdatedChannel,
  ["status"]
>;

export async function fetchOnedriveFileUpdatedRealtimeToken(): Promise<OnedriveFileUpdatedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: onedriveFileUpdatedChannel(),
    topics: ["status"],
  });

  return token;
}
