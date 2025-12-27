"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveDownloadFileChannel } from "@/inngest/channels/google-drive-download-file";

export type GoogleDriveDownloadFileToken = Realtime.Token<
  typeof googleDriveDownloadFileChannel,
  ["status"]
>;

export async function fetchGoogleDriveDownloadFileRealtimeToken(): Promise<GoogleDriveDownloadFileToken> {
  return getSubscriptionToken(inngest, {
    channel: googleDriveDownloadFileChannel(),
    topics: ["status"],
  });
}
