import { channel, topic } from "@inngest/realtime";

export const CANCEL_APPOINTMENT_CHANNEL_NAME = "cancel-appointment-execution";

export const cancelAppointmentChannel = channel(
  CANCEL_APPOINTMENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
