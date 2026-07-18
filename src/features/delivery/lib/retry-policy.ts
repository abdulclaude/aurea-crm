export type DeliveryFailureClassification = "RETRYABLE" | "TERMINAL";

const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  12 * 60 * 60_000,
] as const;

export function classifyHttpFailure(
  httpStatus: number,
): DeliveryFailureClassification {
  if (!Number.isInteger(httpStatus) || httpStatus < 100 || httpStatus > 599) {
    throw new RangeError("HTTP status must be an integer from 100 to 599");
  }

  if (
    httpStatus === 408 ||
    httpStatus === 425 ||
    httpStatus === 429 ||
    httpStatus >= 500
  ) {
    return "RETRYABLE";
  }

  return "TERMINAL";
}

export function getRetryDelayMs(attemptNumber: number): number | null {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new RangeError("Attempt number must be a positive integer");
  }

  return RETRY_DELAYS_MS[attemptNumber - 1] ?? null;
}

type NextRetryAtInput = {
  attemptNumber: number;
  completedAt: Date;
  retryAfter?: Date;
};

export function getNextRetryAt({
  attemptNumber,
  completedAt,
  retryAfter,
}: NextRetryAtInput): Date | null {
  const delayMs = getRetryDelayMs(attemptNumber);
  if (delayMs === null) {
    return null;
  }

  const policyTime = completedAt.getTime() + delayMs;
  const requestedTime = retryAfter?.getTime() ?? policyTime;
  return new Date(Math.max(policyTime, requestedTime));
}
