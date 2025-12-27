import { channel, topic } from "@inngest/realtime";

export const OUTLOOK_CALENDAR_UPDATE_EVENT_CHANNEL_NAME = "outlook-calendar-update-event-execution";

export const outlookCalendarUpdateEventChannel = channel(
  OUTLOOK_CALENDAR_UPDATE_EVENT_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
