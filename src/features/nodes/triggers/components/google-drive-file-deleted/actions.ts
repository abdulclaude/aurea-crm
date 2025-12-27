"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveFileDeletedChannel } from "@/inngest/channels/google-drive-file-deleted";

export type GoogleDriveFileDeletedToken = Realtime.Token<
  typeof googleDriveFileDeletedChannel,
  ["status"]
>;

export async function fetchGoogleDriveFileDeletedRealtimeToken(): Promise<GoogleDriveFileDeletedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDriveFileDeletedChannel(),
    topics: ["status"],
  });

  return token;
}
