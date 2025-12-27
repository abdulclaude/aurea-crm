import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_CALENDAR_EVENT_UPDATED_CHANNEL_NAME = "outlook-calendar-event-updated-trigger";

export const outlookCalendarEventUpdatedChannel = channel(
  OUTLOOK_CALENDAR_EVENT_UPDATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
