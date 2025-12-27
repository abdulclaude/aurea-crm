"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveFileCreatedChannel } from "@/inngest/channels/google-drive-file-created";

export type GoogleDriveFileCreatedToken = Realtime.Token<
  typeof googleDriveFileCreatedChannel,
  ["status"]
>;

export async function fetchGoogleDriveFileCreatedRealtimeToken(): Promise<GoogleDriveFileCreatedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDriveFileCreatedChannel(),
    topics: ["status"],
  });

  return token;
}
