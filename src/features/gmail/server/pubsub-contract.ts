import { createHash, timingSafeEqual } from "node:crypto";

import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { z } from "zod";

const GOOGLE_OIDC_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_OIDC_ISSUERS = [
  "https://accounts.google.com",
  "accounts.google.com",
] as const;

const gmailPubSubEnvelopeSchema = z.object({
  message: z.object({
    data: z.string().min(1),
    messageId: z.string().trim().min(1).max(256),
    publishTime: z.string().datetime({ offset: true }).optional(),
    attributes: z.record(z.string(), z.string()).optional(),
  }),
  subscription: z.string().trim().min(1).optional(),
});

const gmailNotificationDataSchema = z.object({
  emailAddress: z.string().trim().email().transform((value) => value.toLowerCase()),
  historyId: z.string().regex(/^\d+$/),
});

const gmailPubSubAuthConfigSchema = z.object({
  audience: z.string().trim().min(1),
  serviceAccountEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  verificationToken: z.string().min(1).optional(),
});

const googleOidcClaimsSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  email_verified: z.literal(true),
});

export const gmailNotificationInputSchema = z.object({
  subscriptionId: z.string().min(1),
  organizationId: z.string().min(1),
  locationId: z.string().min(1).nullable(),
  providerAccountId: z.string().min(1),
  emailAddress: z.string().email().transform((value) => value.toLowerCase()),
  historyId: z.string().regex(/^\d+$/),
  messageId: z.string().min(1).max(256),
});

export type GmailPubSubAuthConfig = z.infer<
  typeof gmailPubSubAuthConfigSchema
>;

export type GmailPubSubNotification = {
  emailAddress: string;
  historyId: string;
  messageId: string;
};

export type GmailNotificationInput = z.infer<
  typeof gmailNotificationInputSchema
>;

export type GmailOidcTokenVerifier = (input: {
  audience: string;
  token: string;
}) => Promise<JWTPayload>;

export class GmailPubSubConfigurationError extends Error {
  constructor() {
    super("Gmail Pub/Sub authentication is not configured.");
    this.name = "GmailPubSubConfigurationError";
  }
}

export function getGmailPubSubAuthConfig(
  environment: NodeJS.ProcessEnv = process.env,
): GmailPubSubAuthConfig {
  const parsed = gmailPubSubAuthConfigSchema.safeParse({
    audience: environment.GMAIL_PUBSUB_OIDC_AUDIENCE,
    serviceAccountEmail: environment.GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL,
    verificationToken: environment.GMAIL_PUBSUB_VERIFICATION_TOKEN || undefined,
  });
  if (!parsed.success) throw new GmailPubSubConfigurationError();
  return parsed.data;
}

export function parseGmailPubSubNotification(
  rawBody: string,
): GmailPubSubNotification {
  const envelope = gmailPubSubEnvelopeSchema.parse(parseJson(rawBody));
  const decoded = Buffer.from(envelope.message.data, "base64url").toString(
    "utf8",
  );
  const data = gmailNotificationDataSchema.parse(parseJson(decoded));
  return {
    emailAddress: data.emailAddress,
    historyId: data.historyId,
    messageId: envelope.message.messageId,
  };
}

export function verificationTokenMatches(input: {
  expected?: string;
  provided: string | null;
}): boolean {
  if (!input.expected) return true;
  if (!input.provided) return false;
  const expectedHash = createHash("sha256").update(input.expected).digest();
  const providedHash = createHash("sha256").update(input.provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
}

export function bearerTokenFromHeader(value: string | null): string | null {
  if (!value) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(value.trim());
  return match?.[1] ?? null;
}

export async function verifyGmailPubSubOidcToken(input: {
  config: GmailPubSubAuthConfig;
  token: string;
  verifier?: GmailOidcTokenVerifier;
}): Promise<void> {
  const payload = await (input.verifier ?? verifyGoogleOidcToken)({
    audience: input.config.audience,
    token: input.token,
  });
  const claims = googleOidcClaimsSchema.parse(payload);
  if (claims.email !== input.config.serviceAccountEmail) {
    throw new Error("Unexpected Pub/Sub service account.");
  }
}

export function gmailNotificationEventId(
  subscriptionId: string,
  messageId: string,
): string {
  return `gmail:${subscriptionId}:${messageId}`;
}

export function gmailWorkflowEventId(input: {
  latestMessageId: string;
  nodeId: string;
  subscriptionId: string;
}): string {
  return `gmail:${input.subscriptionId}:${input.nodeId}:${input.latestMessageId}`;
}

async function verifyGoogleOidcToken(input: {
  audience: string;
  token: string;
}): Promise<JWTPayload> {
  const result = await jwtVerify(input.token, GOOGLE_OIDC_JWKS, {
    algorithms: ["RS256"],
    audience: input.audience,
    issuer: [...GOOGLE_OIDC_ISSUERS],
  });
  return result.payload;
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}
