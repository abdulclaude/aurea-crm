import { channel, topic } from "@inngest/realtime";

export const UPDATE_PIPELINE_CHANNEL_NAME = "update-pipeline-execution";

export const updatePipelineChannel = channel(
  UPDATE_PIPELINE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
