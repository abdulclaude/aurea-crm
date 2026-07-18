import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_SECONDS = 2 * 60 * 60;
const MAX_TOKEN_TTL_SECONDS = 2 * 60 * 60;

const publicFormSubmissionTokenPayloadSchema = z
  .object({
    targetId: z.string().min(1).max(128),
    versionId: z.string().min(1).max(128),
    formId: z.string().min(1).max(128),
    nonce: z.string().uuid(),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type PublicFormSubmissionTokenPayload = z.infer<
  typeof publicFormSubmissionTokenPayloadSchema
>;

export function createPublicFormSubmissionToken(
  input: Pick<
    PublicFormSubmissionTokenPayload,
    "targetId" | "versionId" | "formId"
  >,
  nowSeconds = Math.floor(Date.now() / 1_000),
): string | null {
  const secret = getSubmissionSecret();
  if (!secret) return null;
  const payload = publicFormSubmissionTokenPayloadSchema.parse({
    ...input,
    nonce: randomUUID(),
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + TOKEN_TTL_SECONDS,
  });
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signedValue = `${TOKEN_VERSION}.${encoded}`;
  return `${signedValue}.${sign(signedValue, secret)}`;
}

export function verifyPublicFormSubmissionToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): PublicFormSubmissionTokenPayload | null {
  const secret = getSubmissionSecret();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;
  const encoded = parts[1];
  const providedSignature = parts[2];
  if (!encoded || !providedSignature) return null;
  const expectedSignature = sign(`${TOKEN_VERSION}.${encoded}`, secret);
  const provided = Buffer.from(providedSignature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }
  try {
    const payload = publicFormSubmissionTokenPayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
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

export function fingerprintPublicFormSubmissionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getSubmissionSecret(): Buffer | null {
  const value = process.env.PUBLIC_FORM_SUBMISSION_SECRET?.trim();
  return value && value.length >= 32 ? Buffer.from(value, "utf8") : null;
}

function sign(value: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
