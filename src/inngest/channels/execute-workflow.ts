import { channel, topic } from "@inngest/realtime";

export const EXECUTE_WORKFLOW_CHANNEL_NAME = "execute-workflow-execution";

export const executeWorkflowChannel = channel(
  EXECUTE_WORKFLOW_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
