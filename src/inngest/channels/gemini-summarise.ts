import { channel, topic } from "@inngest/realtime";

export const GEMINI_SUMMARISE_CHANNEL_NAME = "gemini-summarise-execution";

export const geminiSummariseChannel = channel(
  GEMINI_SUMMARISE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
