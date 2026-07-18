import { TRPCError } from "@trpc/server";
import { eq, isNull } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { Capability } from "@/features/permissions/capabilities";
import { requireCapability } from "@/features/permissions/server/authorization";

export type CancellationContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export function exactCancellationLocation(
  column: AnyPgColumn,
  locationId: string | null,
) {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

export async function requireCancellationAccess(
  ctx: CancellationContext,
  capability: Extract<
    Capability,
    "attendance.manage" | "commerce.view" | "commerce.manage"
  >,
): Promise<{ organizationId: string; locationId: string | null }> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization to manage cancellation policies.",
    });
  }

  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
  });

  return {
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
  };
}
