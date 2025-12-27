"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveFolderCreatedChannel } from "@/inngest/channels/google-drive-folder-created";

export type GoogleDriveFolderCreatedToken = Realtime.Token<
  typeof googleDriveFolderCreatedChannel,
  ["status"]
>;

export async function fetchGoogleDriveFolderCreatedRealtimeToken(): Promise<GoogleDriveFolderCreatedToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDriveFolderCreatedChannel(),
    topics: ["status"],
  });

  return token;
}
