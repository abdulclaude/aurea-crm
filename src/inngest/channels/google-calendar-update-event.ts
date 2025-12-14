import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_UPDATE_EVENT_CHANNEL_NAME = "google-calendar-update-event";

export const googleCalendarUpdateEventChannel = channel(GOOGLE_CALENDAR_UPDATE_EVENT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
