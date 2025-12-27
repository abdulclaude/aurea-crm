import { channel, topic } from "@inngest/realtime";

export const GEMINI_GENERATE_TEXT_CHANNEL_NAME = "gemini-generate-text-execution";

export const geminiGenerateTextChannel = channel(
  GEMINI_GENERATE_TEXT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
