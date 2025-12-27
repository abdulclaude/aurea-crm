import { channel, topic } from "@inngest/realtime";

export const APPOINTMENT_CANCELLED_TRIGGER_CHANNEL_NAME = "appointment-cancelled-trigger-trigger";

export const appointmentCancelledTriggerChannel = channel(
  APPOINTMENT_CANCELLED_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
