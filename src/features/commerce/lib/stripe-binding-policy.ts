export type StripeBindingFailureCode =
  | "STRIPE_ACCOUNT_UNBOUND"
  | "STRIPE_ACCOUNT_SCOPE_MISMATCH"
  | "STRIPE_ACCOUNT_SNAPSHOT_MISMATCH"
  | "STRIPE_EVENT_ACCOUNT_MISMATCH"
  | "UNSUPPORTED_STRIPE_ACCOUNT";

export type StripeBindingReference = {
  stripeConnectionId: string | null;
  providerAccountId?: string | null;
};

export type StripeBindingCandidate = {
  id: string;
  organizationId: string;
  locationId: string | null;
  stripeAccountId: string;
  accountType: string;
};

export function stripeBindingReferenceFailure(
  reference: StripeBindingReference,
  requireExternalSnapshot: boolean,
): StripeBindingFailureCode | null {
  if (!reference.stripeConnectionId) return "STRIPE_ACCOUNT_UNBOUND";
  if (requireExternalSnapshot && !reference.providerAccountId) {
    return "STRIPE_ACCOUNT_UNBOUND";
  }
  return null;
}

export function stripeBindingCandidateFailure(input: {
  expected: {
    stripeConnectionId: string;
    organizationId: string;
    locationId: string | null;
    providerAccountId?: string | null;
  };
  candidate: StripeBindingCandidate | null;
  eventAccountId?: string | null;
}): StripeBindingFailureCode | null {
  const { candidate, expected } = input;
  if (
    !candidate ||
    candidate.id !== expected.stripeConnectionId ||
    candidate.organizationId !== expected.organizationId ||
    candidate.locationId !== expected.locationId
  ) {
    return "STRIPE_ACCOUNT_SCOPE_MISMATCH";
  }
  if (
    expected.providerAccountId &&
    candidate.stripeAccountId !== expected.providerAccountId
  ) {
    return "STRIPE_ACCOUNT_SNAPSHOT_MISMATCH";
  }
  if (
    input.eventAccountId &&
    candidate.stripeAccountId !== input.eventAccountId
  ) {
    return "STRIPE_EVENT_ACCOUNT_MISMATCH";
  }
  if (candidate.accountType.toLowerCase() !== "express") {
    return "UNSUPPORTED_STRIPE_ACCOUNT";
  }
  return null;
}
