import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const TOKEN_VERSION = "v1";
const TOKEN_PURPOSE = "member-check-in";
const TOKEN_TTL_SECONDS = 12 * 60 * 60;
const MAX_TOKEN_TTL_SECONDS = 13 * 60 * 60;

const memberCheckInPassSchema = z
  .object({
    purpose: z.literal(TOKEN_PURPOSE),
    organizationId: z.string().min(1).max(128),
    locationId: z.string().min(1).max(128).nullable(),
    clientId: z.string().min(1).max(128),
    nonce: z.string().uuid(),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type MemberCheckInPass = z.infer<typeof memberCheckInPassSchema>;

export function createMemberCheckInPass(
  input: Pick<MemberCheckInPass, "organizationId" | "locationId" | "clientId">,
  nowSeconds = Math.floor(Date.now() / 1_000),
  nonce = randomUUID(),
): string | null {
  const secret = getCheckInPassSecret();
  if (!secret) return null;

  const payload = memberCheckInPassSchema.parse({
    ...input,
    purpose: TOKEN_PURPOSE,
    nonce,
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + TOKEN_TTL_SECONDS,
  });
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signedValue = `${TOKEN_VERSION}.${encodedPayload}`;
  return `${signedValue}.${sign(signedValue, secret)}`;
}

export function verifyMemberCheckInPass(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): MemberCheckInPass | null {
  const secret = getCheckInPassSecret();
  if (!secret) return null;

  const parts = token.trim().split(".");
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
    const payload = memberCheckInPassSchema.parse(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")),
    );
    if (payload.issuedAt > nowSeconds + 60) return null;
    if (payload.expiresAt <= nowSeconds) return null;
    if (payload.expiresAt <= payload.issuedAt) return null;
    if (payload.expiresAt - nowSeconds > MAX_TOKEN_TTL_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCheckInPassSecret(): Buffer | null {
  const value =
    process.env.CHECKIN_PASS_SECRET?.trim() ??
    process.env.ENCRYPTION_KEY?.trim();
  return value && value.length >= 32 ? Buffer.from(value, "utf8") : null;
}

function sign(value: string, secret: Buffer): string {
  return createHmac("sha256", secret)
    .update(`aurea:${TOKEN_PURPOSE}:${value}`)
    .digest("base64url");
}
