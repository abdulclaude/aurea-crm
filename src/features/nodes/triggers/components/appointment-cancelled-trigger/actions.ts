"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { appointmentCancelledTriggerChannel } from "@/inngest/channels/appointment-cancelled-trigger";

export type AppointmentCancelledTriggerToken = Realtime.Token<
  typeof appointmentCancelledTriggerChannel,
  ["status"]
>;

export async function fetchAppointmentCancelledTriggerRealtimeToken(): Promise<AppointmentCancelledTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: appointmentCancelledTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
