"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { googleDriveCreateFolderChannel } from "@/inngest/channels/google-drive-create-folder";

export type GoogleDriveCreateFolderToken = Realtime.Token<
  typeof googleDriveCreateFolderChannel,
  ["status"]
>;

export async function fetchGoogleDriveCreateFolderRealtimeToken(): Promise<GoogleDriveCreateFolderToken> {
  return getSubscriptionToken(inngest, {
    channel: googleDriveCreateFolderChannel(),
    topics: ["status"],
  });
}
