import { createHmac } from "node:crypto";

export type PublicationQuotaPolicy = {
  action: string;
  windowSeconds: number;
  subjectLimit: number;
  globalLimit: number;
};

export type PublicationQuotaCounter = {
  dimension: "SUBJECT" | "GLOBAL";
  subjectKeyHash: string;
  limit: number;
};

export const PUBLIC_FORM_SUBMISSION_QUOTA = {
  action: "FORM_SUBMISSION",
  windowSeconds: 10 * 60,
  subjectLimit: 8,
  globalLimit: 240,
} as const satisfies PublicationQuotaPolicy;

export const PUBLIC_TRACKING_QUOTA = {
  action: "FIRST_PARTY_TRACKING",
  windowSeconds: 10 * 60,
  subjectLimit: 120,
  globalLimit: 5_000,
} as const satisfies PublicationQuotaPolicy;

export const PUBLICATION_QUOTA_PURGE_BATCH_SIZE = 1_000;

export class PublicationQuotaExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("The publication request quota has been reached.");
    this.name = "PublicationQuotaExceededError";
  }
}

export class PublicationQuotaUnavailableError extends Error {
  constructor() {
    super("Publication request quota is unavailable.");
    this.name = "PublicationQuotaUnavailableError";
  }
}

export async function consumePublicationQuotaCounters(
  counters: readonly PublicationQuotaCounter[],
  retryAfterSeconds: number,
  consume: (counter: PublicationQuotaCounter) => Promise<boolean>,
): Promise<void> {
  for (const counter of counters) {
    if (!(await consume(counter))) {
      throw new PublicationQuotaExceededError(retryAfterSeconds);
    }
  }
}

export function createPublicationQuotaCounters(input: {
  organizationId: string;
  targetId: string;
  action: string;
  subject: string;
  secret: string;
  subjectLimit: number;
  globalLimit: number;
}): PublicationQuotaCounter[] {
  const scope = `${input.organizationId}\0${input.targetId}\0${input.action}`;
  return [
    {
      dimension: "SUBJECT",
      subjectKeyHash: hmac(`${scope}\0SUBJECT\0${input.subject}`, input.secret),
      limit: input.subjectLimit,
    },
    {
      dimension: "GLOBAL",
      subjectKeyHash: hmac(`${scope}\0GLOBAL`, input.secret),
      limit: input.globalLimit,
    },
  ];
}

export function publicationQuotaWindowStart(
  now: Date,
  windowSeconds: number,
): Date {
  const windowMilliseconds = windowSeconds * 1_000;
  return new Date(
    Math.floor(now.getTime() / windowMilliseconds) * windowMilliseconds,
  );
}

export function normalizePublicationQuotaPurgeBatchSize(value: number): number {
  if (!Number.isFinite(value)) return PUBLICATION_QUOTA_PURGE_BATCH_SIZE;
  return Math.max(
    1,
    Math.min(PUBLICATION_QUOTA_PURGE_BATCH_SIZE, Math.floor(value)),
  );
}

export function assertPublicationQuotaPolicy(
  policy: PublicationQuotaPolicy,
): void {
  if (
    !/^[A-Z][A-Z0-9_]{0,99}$/.test(policy.action) ||
    !Number.isInteger(policy.windowSeconds) ||
    policy.windowSeconds < 1 ||
    policy.windowSeconds > 86_400 ||
    !Number.isInteger(policy.subjectLimit) ||
    policy.subjectLimit < 1 ||
    !Number.isInteger(policy.globalLimit) ||
    policy.globalLimit < 1
  ) {
    throw new PublicationQuotaUnavailableError();
  }
}

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}
