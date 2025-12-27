"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { onedriveUploadFileChannel } from "@/inngest/channels/onedrive-upload-file";

export type OnedriveUploadFileToken = Realtime.Token<
  typeof onedriveUploadFileChannel,
  ["status"]
>;

export async function fetchOnedriveUploadFileRealtimeToken(): Promise<OnedriveUploadFileToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: onedriveUploadFileChannel(),
    topics: ["status"],
  });

  return token;
}
