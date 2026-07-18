import { TRPCError } from "@trpc/server";
import { eq, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";

export type PaymentRecoveryScope = {
  organizationId: string;
  locationId: string | null;
};

type PaymentRecoveryContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export function exactRecoveryLocation(
  column: AnyPgColumn,
  locationId: string | null,
): SQL {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

export async function requirePaymentRecoveryAccess(
  ctx: PaymentRecoveryContext,
  capability: Extract<Capability, "commerce.view" | "commerce.manage">,
): Promise<PaymentRecoveryScope> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing payment recovery.",
    });
  }
  const scope = { organizationId: ctx.orgId, locationId: ctx.locationId };
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
    resource: scope,
  });
  return scope;
}
