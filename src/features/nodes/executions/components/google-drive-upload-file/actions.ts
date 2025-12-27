"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveUploadFileChannel } from "@/inngest/channels/google-drive-upload-file";

export type GoogleDriveUploadFileToken = Realtime.Token<
  typeof googleDriveUploadFileChannel,
  ["status"]
>;

export async function fetchGoogleDriveUploadFileRealtimeToken(): Promise<GoogleDriveUploadFileToken> {
  return getSubscriptionToken(inngest, {
    channel: googleDriveUploadFileChannel(),
    topics: ["status"],
  });
}
