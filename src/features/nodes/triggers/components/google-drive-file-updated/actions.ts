"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveFileUpdatedChannel } from "@/inngest/channels/google-drive-file-updated";

export type GoogleDriveFileUpdatedToken = Realtime.Token<
  typeof googleDriveFileUpdatedChannel,
  ["status"]
>;

export async function fetchGoogleDriveFileUpdatedRealtimeToken(): Promise<GoogleDriveFileUpdatedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDriveFileUpdatedChannel(),
    topics: ["status"],
  });

  return token;
}
