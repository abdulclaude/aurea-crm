import { channel, topic } from "@inngest/realtime";

export const SCHEDULE_APPOINTMENT_CHANNEL_NAME = "schedule-appointment-execution";

export const scheduleAppointmentChannel = channel(
  SCHEDULE_APPOINTMENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
