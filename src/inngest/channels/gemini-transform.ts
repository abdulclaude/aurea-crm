import { channel, topic } from "@inngest/realtime";

export const GEMINI_TRANSFORM_CHANNEL_NAME = "gemini-transform-execution";

export const geminiTransformChannel = channel(
  GEMINI_TRANSFORM_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
