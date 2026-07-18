import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const uploadReceiptSchema = z.object({
  expiresAt: z.number().int().positive(),
  key: z.string().min(1),
  locationId: z.string().nullable(),
  organizationId: z.string(),
  route: z.literal("waiverDocument"),
  url: z.url(),
  userId: z.string(),
});

type UploadReceiptPayload = z.infer<typeof uploadReceiptSchema>;

function signingKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters.");
  }
  return key;
}

function signature(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createUploadReceipt(
  input: Omit<UploadReceiptPayload, "expiresAt">,
  key = signingKey(),
) {
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1_000 }),
  ).toString("base64url");
  return `${payload}.${signature(payload, key)}`;
}

export function verifyUploadReceipt(
  receipt: string,
  expected: Omit<UploadReceiptPayload, "expiresAt">,
  key = signingKey(),
) {
  const [payload, providedSignature, extra] = receipt.split(".");
  if (!payload || !providedSignature || extra) return false;
  const expectedSignature = signature(payload, key);
  const provided = Buffer.from(providedSignature);
  const calculated = Buffer.from(expectedSignature);
  if (provided.length !== calculated.length || !timingSafeEqual(provided, calculated)) {
    return false;
  }

  try {
    const parsed = uploadReceiptSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown,
    );
    return (
      parsed.success &&
      parsed.data.expiresAt >= Date.now() &&
      parsed.data.key === expected.key &&
      parsed.data.url === expected.url &&
      parsed.data.userId === expected.userId &&
      parsed.data.organizationId === expected.organizationId &&
      parsed.data.locationId === expected.locationId &&
      parsed.data.route === expected.route
    );
  } catch {
    return false;
  }
}
