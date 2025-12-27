"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { scheduleAppointmentChannel } from "@/inngest/channels/schedule-appointment";

export type ScheduleAppointmentToken = Realtime.Token<
  typeof scheduleAppointmentChannel,
  ["status"]
>;

export async function fetchScheduleAppointmentRealtimeToken(): Promise<ScheduleAppointmentToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: scheduleAppointmentChannel(),
    topics: ["status"],
  });

  return token;
}
