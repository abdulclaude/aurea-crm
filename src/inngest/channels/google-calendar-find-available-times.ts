import { channel, topic } from "@inngest/realtime";

export const GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES_CHANNEL_NAME = "google-calendar-find-available-times-execution";

export const googleCalendarFindAvailableTimesChannel = channel(
  GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
