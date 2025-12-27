"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { slackUploadFileChannel } from "@/inngest/channels/slack-upload-file";

export type SlackUploadFileToken = Realtime.Token<
  typeof slackUploadFileChannel,
  ["status"]
>;

export async function fetchSlackUploadFileRealtimeToken(): Promise<SlackUploadFileToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: slackUploadFileChannel(),
    topics: ["status"],
  });

  return token;
}
