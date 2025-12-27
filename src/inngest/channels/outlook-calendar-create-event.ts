import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_CALENDAR_CREATE_EVENT_CHANNEL_NAME = "outlook-calendar-create-event-execution";

export const outlookCalendarCreateEventChannel = channel(
  OUTLOOK_CALENDAR_CREATE_EVENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
