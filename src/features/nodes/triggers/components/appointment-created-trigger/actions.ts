"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { appointmentCreatedTriggerChannel } from "@/inngest/channels/appointment-created-trigger";

export type AppointmentCreatedTriggerToken = Realtime.Token<
  typeof appointmentCreatedTriggerChannel,
  ["status"]
>;

export async function fetchAppointmentCreatedTriggerRealtimeToken(): Promise<AppointmentCreatedTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: appointmentCreatedTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
