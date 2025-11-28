import { channel, topic } from "@inngest/realtime";

export const STOP_WORKFLOW_CHANNEL_NAME = "stop-workflow-execution";

export const stopWorkflowChannel = channel(
  STOP_WORKFLOW_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
