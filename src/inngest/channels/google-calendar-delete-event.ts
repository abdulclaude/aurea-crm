import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_DELETE_EVENT_CHANNEL_NAME = "google-calendar-delete-event";

export const googleCalendarDeleteEventChannel = channel(GOOGLE_CALENDAR_DELETE_EVENT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
