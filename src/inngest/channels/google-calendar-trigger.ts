import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_TRIGGER_CHANNEL_NAME = "google-calendar-trigger";

export const googleCalendarTriggerChannel = channel(
  GOOGLE_CALENDAR_TRIGGER_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
