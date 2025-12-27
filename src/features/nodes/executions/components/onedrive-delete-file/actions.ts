"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { onedriveDeleteFileChannel } from "@/inngest/channels/onedrive-delete-file";

export type OnedriveDeleteFileToken = Realtime.Token<
  typeof onedriveDeleteFileChannel,
  ["status"]
>;

export async function fetchOnedriveDeleteFileRealtimeToken(): Promise<OnedriveDeleteFileToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: onedriveDeleteFileChannel(),
    topics: ["status"],
  });

  return token;
}
