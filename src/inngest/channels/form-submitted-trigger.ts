import { channel, topic } from "@inngest/realtime";

export const FORM_SUBMITTED_TRIGGER_CHANNEL_NAME = "form-submitted-trigger";

export const formSubmittedTriggerChannel = channel(
  FORM_SUBMITTED_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
