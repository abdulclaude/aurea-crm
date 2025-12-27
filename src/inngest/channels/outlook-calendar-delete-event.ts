import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_CALENDAR_DELETE_EVENT_CHANNEL_NAME = "outlook-calendar-delete-event-execution";

export const outlookCalendarDeleteEventChannel = channel(
  OUTLOOK_CALENDAR_DELETE_EVENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
