"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { bundleWorkflowChannel } from "@/inngest/channels/bundle-workflow";

export type BundleWorkflowToken = Realtime.Token<
  typeof bundleWorkflowChannel,
  ["status"]
>;

export async function fetchBundleWorkflowRealtimeToken(): Promise<BundleWorkflowToken> {
  return getSubscriptionToken(inngest, {
    channel: bundleWorkflowChannel(),
    topics: ["status"],
  });
}
