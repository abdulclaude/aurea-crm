import "server-only";

import { eq } from "drizzle-orm";

import { stripeConnection } from "@/db/schema";
import {
  stripeBindingCandidateFailure,
  stripeBindingReferenceFailure,
  type StripeBindingFailureCode,
} from "@/features/commerce/lib/stripe-binding-policy";

import { PermanentStripeEventError } from "./stripe-event-contract";
import type { CommerceTransaction } from "./stripe-event-receipt";

export async function requireHistoricalStripeConnection(input: {
  tx: CommerceTransaction;
  stripeConnectionId: string | null;
  organizationId: string;
  locationId: string | null;
  providerAccountId?: string | null;
  eventAccountId?: string | null;
  requireExternalSnapshot?: boolean;
}): Promise<{ id: string; stripeAccountId: string }> {
  const referenceFailure = stripeBindingReferenceFailure(
    {
      stripeConnectionId: input.stripeConnectionId,
      providerAccountId: input.providerAccountId,
    },
    input.requireExternalSnapshot ?? false,
  );
  if (referenceFailure || !input.stripeConnectionId) {
    throwBindingError(referenceFailure ?? "STRIPE_ACCOUNT_UNBOUND");
  }

  const connection = await input.tx.query.stripeConnection.findFirst({
    where: eq(stripeConnection.id, input.stripeConnectionId),
    columns: {
      id: true,
      organizationId: true,
      locationId: true,
      stripeAccountId: true,
      accountType: true,
    },
  });
  const candidateFailure = stripeBindingCandidateFailure({
    expected: {
      stripeConnectionId: input.stripeConnectionId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      providerAccountId: input.providerAccountId,
    },
    candidate: connection ?? null,
    eventAccountId: input.eventAccountId,
  });
  if (candidateFailure || !connection) {
    throwBindingError(candidateFailure ?? "STRIPE_ACCOUNT_SCOPE_MISMATCH");
  }

  return { id: connection.id, stripeAccountId: connection.stripeAccountId };
}

function throwBindingError(code: StripeBindingFailureCode): never {
  const messages: Record<StripeBindingFailureCode, string> = {
    STRIPE_ACCOUNT_UNBOUND:
      "Stripe resource has no immutable workspace account binding",
    STRIPE_ACCOUNT_SCOPE_MISMATCH:
      "Stripe account binding does not belong to the recorded workspace",
    STRIPE_ACCOUNT_SNAPSHOT_MISMATCH:
      "Stripe account binding no longer matches its recorded account snapshot",
    STRIPE_EVENT_ACCOUNT_MISMATCH:
      "Stripe event account does not match the resource account binding",
    UNSUPPORTED_STRIPE_ACCOUNT:
      "Stripe resource is not bound to a supported Express account",
  };
  throw new PermanentStripeEventError(code, messages[code]);
}
