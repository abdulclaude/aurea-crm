"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { onedriveDownloadFileChannel } from "@/inngest/channels/onedrive-download-file";

export type OnedriveDownloadFileToken = Realtime.Token<
  typeof onedriveDownloadFileChannel,
  ["status"]
>;

export async function fetchOnedriveDownloadFileRealtimeToken(): Promise<OnedriveDownloadFileToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: onedriveDownloadFileChannel(),
    topics: ["status"],
  });

  return token;
}
