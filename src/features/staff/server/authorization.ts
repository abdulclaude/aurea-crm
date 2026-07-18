import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { location } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";

export function getScopedStaffLocationId(
  input: { locationId?: string; includeAllLocations?: boolean },
  contextLocationId: string | null,
): string | null | undefined {
  if (input.includeAllLocations) return undefined;
  if (input.locationId !== undefined) return input.locationId || null;
  return contextLocationId;
}

export async function authorizeStaffAccess(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
  capability: "team.view" | "team.manage";
}): Promise<string> {
  if (!input.organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing staff.",
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
  return input.organizationId;
}

export async function validateRequestedStaffLocation(input: {
  organizationId: string;
  activeLocationId: string | null;
  requestedLocationId: string | null | undefined;
  includeAllLocations?: boolean;
}): Promise<void> {
  if (input.activeLocationId) {
    if (
      input.includeAllLocations ||
      (input.requestedLocationId !== undefined &&
        input.requestedLocationId !== input.activeLocationId)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "The requested staff scope is outside the active location.",
      });
    }
    return;
  }
  if (!input.requestedLocationId) return;

  const [ownedLocation] = await db
    .select({ id: location.id })
    .from(location)
    .where(
      and(
        eq(location.id, input.requestedLocationId),
        eq(location.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!ownedLocation) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The requested location is not part of this organization.",
    });
  }
}
