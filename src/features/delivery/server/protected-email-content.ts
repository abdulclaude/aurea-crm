import "server-only";

import type { z } from "zod";

import { emailDeliveryPayloadSchema } from "@/features/delivery/lib/payload-schemas";
import { decrypt, encrypt } from "@/lib/encryption";

type EmailDeliveryPayload = z.infer<typeof emailDeliveryPayloadSchema>;

export function protectEmailContent(input: {
  html?: string;
  text?: string;
}): Pick<EmailDeliveryPayload, "protectedContent"> {
  return {
    protectedContent: {
      scheme: "AUREA_ENCRYPTED_V1",
      html: input.html ? encrypt(input.html) : undefined,
      text: input.text ? encrypt(input.text) : undefined,
    },
  };
}

export function materializeEmailContent(
  payload: EmailDeliveryPayload,
): EmailDeliveryPayload {
  if (!payload.protectedContent) {
    return payload;
  }

  return {
    ...payload,
    html: payload.protectedContent.html
      ? decrypt(payload.protectedContent.html)
      : undefined,
    text: payload.protectedContent.text
      ? decrypt(payload.protectedContent.text)
      : undefined,
    protectedContent: undefined,
  };
}
