import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_SECONDS = 10 * 60;
const MAX_TOKEN_TTL_SECONDS = 20 * 60;

const tokenPayloadSchema = z
  .object({
    targetId: z.string().min(1).max(128),
    versionId: z.string().min(1).max(128),
    funnelId: z.string().min(1).max(128),
    nonce: z.string().uuid(),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type PublicationTrackingTokenPayload = z.infer<
  typeof tokenPayloadSchema
>;

export function createPublicationTrackingToken(
  input: Pick<
    PublicationTrackingTokenPayload,
    "targetId" | "versionId" | "funnelId"
  >,
  nowSeconds = Math.floor(Date.now() / 1_000),
  nonce = randomUUID(),
): string | null {
  const secret = getTrackingSecret();
  if (!secret) return null;

  const payload = tokenPayloadSchema.parse({
    ...input,
    nonce,
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + TOKEN_TTL_SECONDS,
  });
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signedValue = `${TOKEN_VERSION}.${encodedPayload}`;
  const signature = sign(signedValue, secret);
  return `${signedValue}.${signature}`;
}

export function verifyPublicationTrackingToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): PublicationTrackingTokenPayload | null {
  const secret = getTrackingSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;
  const encodedPayload = parts[1];
  const providedSignature = parts[2];
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(
    `${TOKEN_VERSION}.${encodedPayload}`,
    secret,
  );
  const provided = Buffer.from(providedSignature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const payload = tokenPayloadSchema.parse(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")),
    );
    if (payload.issuedAt > nowSeconds + 60) return null;
    if (payload.expiresAt <= nowSeconds) return null;
    if (payload.expiresAt - nowSeconds > MAX_TOKEN_TTL_SECONDS) return null;
    if (payload.expiresAt <= payload.issuedAt) return null;
    return payload;
  } catch {
    return null;
  }
}

function getTrackingSecret(): Buffer | null {
  const value = process.env.PUBLICATION_TRACKING_SECRET?.trim();
  return value && value.length >= 32 ? Buffer.from(value, "utf8") : null;
}

function sign(value: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
