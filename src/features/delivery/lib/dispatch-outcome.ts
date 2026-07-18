import type { DeliveryProvider } from "@/features/delivery/contracts";
import { getNextRetryAt } from "@/features/delivery/lib/retry-policy";
import type { DeliveryDispatchResult } from "@/features/delivery/server/providers/provider";

export type DispatchOutcomeMutation = {
  attemptOutcome:
    | "ACCEPTED"
    | "RETRYABLE_FAILURE"
    | "TERMINAL_FAILURE"
    | "AMBIGUOUS";
  status: "QUEUED" | "ACCEPTED" | "DELIVERED" | "DEAD_LETTER" | "UNKNOWN";
  providerMessageId: string | null;
  providerRequestId: string | null;
  failureClass: "RETRYABLE" | "TERMINAL" | "AMBIGUOUS" | null;
  errorCode: string | null;
  errorMessage: string | null;
  acceptedAt: Date | null;
  deliveredAt: Date | null;
  nextAttemptAt: Date | null;
};

type ResolveDispatchOutcomeInput = {
  result: DeliveryDispatchResult;
  provider: DeliveryProvider;
  attemptNumber: number;
  maxAttempts: number;
  completedAt: Date;
};

export function resolveDispatchOutcome({
  result,
  provider,
  attemptNumber,
  maxAttempts,
  completedAt,
}: ResolveDispatchOutcomeInput): DispatchOutcomeMutation {
  if (result.kind === "accepted") {
    const deliveredInternally = provider === "INTERNAL";
    return {
      attemptOutcome: "ACCEPTED",
      status: deliveredInternally ? "DELIVERED" : "ACCEPTED",
      providerMessageId: result.providerMessageId,
      providerRequestId: result.providerRequestId ?? null,
      failureClass: null,
      errorCode: null,
      errorMessage: null,
      acceptedAt: result.acceptedAt,
      deliveredAt: deliveredInternally ? result.acceptedAt : null,
      nextAttemptAt: null,
    };
  }

  if (result.kind === "retryable") {
    const nextAttemptAt =
      attemptNumber < maxAttempts
        ? getNextRetryAt({
            attemptNumber,
            completedAt,
            retryAfter: result.retryAfter,
          })
        : null;
    const willRetry = nextAttemptAt !== null;
    return {
      attemptOutcome: "RETRYABLE_FAILURE",
      status: willRetry ? "QUEUED" : "DEAD_LETTER",
      providerMessageId: null,
      providerRequestId: null,
      failureClass: "RETRYABLE",
      errorCode: result.code,
      errorMessage: result.message,
      acceptedAt: null,
      deliveredAt: null,
      nextAttemptAt,
    };
  }

  if (result.kind === "terminal") {
    return {
      attemptOutcome: "TERMINAL_FAILURE",
      status: "DEAD_LETTER",
      providerMessageId: null,
      providerRequestId: null,
      failureClass: "TERMINAL",
      errorCode: result.code,
      errorMessage: result.message,
      acceptedAt: null,
      deliveredAt: null,
      nextAttemptAt: null,
    };
  }

  return {
    attemptOutcome: "AMBIGUOUS",
    status: "UNKNOWN",
    providerMessageId: null,
    providerRequestId: null,
    failureClass: "AMBIGUOUS",
    errorCode: result.code,
    errorMessage: result.message,
    acceptedAt: null,
    deliveredAt: null,
    nextAttemptAt: null,
  };
}
