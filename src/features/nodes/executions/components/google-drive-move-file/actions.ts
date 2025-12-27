"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveMoveFileChannel } from "@/inngest/channels/google-drive-move-file";

export type GoogleDriveMoveFileToken = Realtime.Token<
  typeof googleDriveMoveFileChannel,
  ["status"]
>;

export async function fetchGoogleDriveMoveFileRealtimeToken(): Promise<GoogleDriveMoveFileToken> {
  return getSubscriptionToken(inngest, {
    channel: googleDriveMoveFileChannel(),
    topics: ["status"],
  });
}
