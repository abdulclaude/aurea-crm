"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { onedriveMoveFileChannel } from "@/inngest/channels/onedrive-move-file";

export type OnedriveMoveFileToken = Realtime.Token<
  typeof onedriveMoveFileChannel,
  ["status"]
>;

export async function fetchOnedriveMoveFileRealtimeToken(): Promise<OnedriveMoveFileToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: onedriveMoveFileChannel(),
    topics: ["status"],
  });

  return token;
}
