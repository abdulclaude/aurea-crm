import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_EVENT_CREATED_CHANNEL_NAME = "google-calendar-event-created-trigger";

export const googleCalendarEventCreatedChannel = channel(
  GOOGLE_CALENDAR_EVENT_CREATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
