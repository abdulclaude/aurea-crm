"use server";

import { inngest } from "@/inngest/client";

type WhatsAppChangePayload = Record<string, unknown>;

export async function enqueueWhatsAppUpdate({
  integrationId,
  userId,
  payload,
}: {
  integrationId: string;
  userId: string;
  payload: WhatsAppChangePayload;
}) {
  await inngest.send({
    name: "whatsapp/update",
    data: {
      integrationId,
      userId,
      payload,
    },
  });
}

