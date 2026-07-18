import { channel, topic } from "@inngest/realtime";

export const STUDIO_BOOKING_ACTION_CHANNEL_NAME =
  "studio-booking-action-execution";

export const studioBookingActionChannel = channel(
  STUDIO_BOOKING_ACTION_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
