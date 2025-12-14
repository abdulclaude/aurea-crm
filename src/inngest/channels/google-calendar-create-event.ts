import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_CREATE_EVENT_CHANNEL_NAME = "google-calendar-create-event";

export const googleCalendarCreateEventChannel = channel(GOOGLE_CALENDAR_CREATE_EVENT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
