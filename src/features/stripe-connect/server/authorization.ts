import "server-only";

import { TRPCError } from "@trpc/server";

import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";

export type StripeConnectContext = {
  userId: string;
  organizationId: string;
  locationId: string | null;
};

export async function authorizeStripeConnectContext(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
  capability: Capability;
}): Promise<StripeConnectContext> {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before setting up Stripe",
    });
  }

  await requireCapability({
    actor: {
      userId: input.userId,
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
    capability: input.capability,
    resource: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
  });

  return {
    userId: input.userId,
    organizationId: input.organizationId,
    locationId: input.locationId,
  };
}
