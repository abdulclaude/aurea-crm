import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_EVENT_UPDATED_CHANNEL_NAME = "google-calendar-event-updated-trigger";

export const googleCalendarEventUpdatedChannel = channel(
  GOOGLE_CALENDAR_EVENT_UPDATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
