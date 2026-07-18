"use server";

import { inngest } from "@/inngest/client";

type TelegramUpdatePayload = {
  update_id: number;
  [key: string]: unknown;
};

export async function enqueueTelegramUpdate({
  credentialId,
  organizationId,
  locationId,
  update,
}: {
  credentialId: string;
  organizationId: string;
  locationId: string | null;
  update: TelegramUpdatePayload;
}) {
  await inngest.send({
    name: "telegram/update",
    id: `telegram:${credentialId}:${update.update_id}`,
    data: {
      credentialId,
      organizationId,
      locationId,
      update,
    },
  });
}
