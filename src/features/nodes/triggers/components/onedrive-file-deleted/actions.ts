"use server";

import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { onedriveFileDeletedChannel } from "@/inngest/channels/onedrive-file-deleted";

export type OnedriveFileDeletedToken = Realtime.Token<
  typeof onedriveFileDeletedChannel,
  ["status"]
>;

export async function fetchOnedriveFileDeletedRealtimeToken(): Promise<OnedriveFileDeletedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: onedriveFileDeletedChannel(),
    topics: ["status"],
  });

  return token;
}
