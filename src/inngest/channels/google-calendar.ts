import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_CHANNEL_NAME = "google-calendar-execution";

export const googleCalendarChannel = channel(
  GOOGLE_CALENDAR_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
