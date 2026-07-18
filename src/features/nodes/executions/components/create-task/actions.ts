"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

import { inngest } from "@/inngest/client";
import { createTaskChannel } from "@/inngest/channels/create-task";

export type CreateTaskToken = Realtime.Token<
  typeof createTaskChannel,
  ["status"]
>;

export async function fetchCreateTaskRealtimeToken(): Promise<CreateTaskToken> {
  return getSubscriptionToken(inngest, {
    channel: createTaskChannel(),
    topics: ["status"],
  });
}
