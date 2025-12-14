import { channel, topic } from "@inngest/realtime";

export const GOOGLE_FORM_READ_RESPONSES_CHANNEL_NAME = "google-form-read-responses";

export const googleFormReadResponsesChannel = channel(GOOGLE_FORM_READ_RESPONSES_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
