import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_CALENDAR_EVENT_CREATED_CHANNEL_NAME = "outlook-calendar-event-created-trigger";

export const outlookCalendarEventCreatedChannel = channel(
  OUTLOOK_CALENDAR_EVENT_CREATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
