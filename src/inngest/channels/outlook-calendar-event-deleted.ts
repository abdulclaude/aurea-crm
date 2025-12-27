import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_CALENDAR_EVENT_DELETED_CHANNEL_NAME = "outlook-calendar-event-deleted-trigger";

export const outlookCalendarEventDeletedChannel = channel(
  OUTLOOK_CALENDAR_EVENT_DELETED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
