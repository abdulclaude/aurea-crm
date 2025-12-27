"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveDeleteFileChannel } from "@/inngest/channels/google-drive-delete-file";

export type GoogleDriveDeleteFileToken = Realtime.Token<
  typeof googleDriveDeleteFileChannel,
  ["status"]
>;

export async function fetchGoogleDriveDeleteFileRealtimeToken(): Promise<GoogleDriveDeleteFileToken> {
  return getSubscriptionToken(inngest, {
    channel: googleDriveDeleteFileChannel(),
    topics: ["status"],
  });
}
