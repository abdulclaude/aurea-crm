"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { updateAppointmentChannel } from "@/inngest/channels/update-appointment";

export type UpdateAppointmentToken = Realtime.Token<
  typeof updateAppointmentChannel,
  ["status"]
>;

export async function fetchUpdateAppointmentRealtimeToken(): Promise<UpdateAppointmentToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: updateAppointmentChannel(),
    topics: ["status"],
  });

  return token;
}
