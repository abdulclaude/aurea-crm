"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { cancelAppointmentChannel } from "@/inngest/channels/cancel-appointment";

export type CancelAppointmentToken = Realtime.Token<
  typeof cancelAppointmentChannel,
  ["status"]
>;

export async function fetchCancelAppointmentRealtimeToken(): Promise<CancelAppointmentToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: cancelAppointmentChannel(),
    topics: ["status"],
  });

  return token;
}
