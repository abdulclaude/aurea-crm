import { channel, topic } from "@inngest/realtime";

export const UPDATE_APPOINTMENT_CHANNEL_NAME = "update-appointment-execution";

export const updateAppointmentChannel = channel(
  UPDATE_APPOINTMENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
