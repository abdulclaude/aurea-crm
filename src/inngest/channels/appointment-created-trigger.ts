import { channel, topic } from "@inngest/realtime";

export const APPOINTMENT_CREATED_TRIGGER_CHANNEL_NAME = "appointment-created-trigger-trigger";

export const appointmentCreatedTriggerChannel = channel(
  APPOINTMENT_CREATED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
