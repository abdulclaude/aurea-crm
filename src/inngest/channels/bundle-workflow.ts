import { channel, topic } from "@inngest/realtime";

export const BUNDLE_WORKFLOW_CHANNEL_NAME = "bundle-workflow";

export const bundleWorkflowChannel = channel(
  BUNDLE_WORKFLOW_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
    currentIndex?: number;
    totalIterations?: number;
  }>()
);
