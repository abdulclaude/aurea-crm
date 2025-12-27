import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_EVENT_DELETED_CHANNEL_NAME = "google-calendar-event-deleted-trigger";

export const googleCalendarEventDeletedChannel = channel(
  GOOGLE_CALENDAR_EVENT_DELETED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
