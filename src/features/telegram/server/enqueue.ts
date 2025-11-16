"use server";

import { inngest } from "@/inngest/client";

type TelegramUpdatePayload = {
  update_id: number;
  [key: string]: unknown;
};

export async function enqueueTelegramUpdate({
  credentialId,
  userId,
  update,
}: {
  credentialId: string;
  userId: string;
  update: TelegramUpdatePayload;
}) {
  await inngest.send({
    name: "telegram/update",
    data: {
      credentialId,
      userId,
      update,
    },
  });
}
