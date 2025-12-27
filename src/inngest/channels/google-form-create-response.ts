import { channel, topic } from "@inngest/realtime";

export const GOOGLE_FORM_CREATE_RESPONSE_CHANNEL_NAME = "google-form-create-response-execution";

export const googleFormCreateResponseChannel = channel(
  GOOGLE_FORM_CREATE_RESPONSE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
