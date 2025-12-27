import { channel, topic } from "@inngest/realtime";

export const GEMINI_CLASSIFY_CHANNEL_NAME = "gemini-classify-execution";

export const geminiClassifyChannel = channel(
  GEMINI_CLASSIFY_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
