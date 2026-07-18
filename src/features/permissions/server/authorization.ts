import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { location, locationMember, member, staffIdentity } from "@/db/schema";
import type { Capability } from "@/features/permissions/capabilities";
import {
  evaluateCapabilityAccess,
  type ActorCapabilitySnapshot,
  type ResourceAuthorizationScope,
} from "@/features/permissions/authorization-policy";
import {
  organizationRoleHasCapability,
  resolveRoleCapabilities,
} from "@/features/permissions/role-matrix";
import { isStaffIdentityAccessBlocked } from "@/features/staff-identities/lib/identity-policy";

const organizationStaffIdentity = alias(
  staffIdentity,
  "organizationStaffIdentity",
);
const locationStaffIdentity = alias(staffIdentity, "locationStaffIdentity");

export type CapabilityActorContext = {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
};

export async function getActorCapabilitySnapshot(
  actor: CapabilityActorContext,
): Promise<ActorCapabilitySnapshot> {
  if (!actor.organizationId) {
    return {
      organizationId: null,
      locationId: null,
      organizationRole: null,
      locationRole: null,
      capabilities: [],
    };
  }

  const organizationMembershipPromise = db
    .select({
      role: member.role,
      identityStatus: organizationStaffIdentity.status,
    })
    .from(member)
    .leftJoin(
      organizationStaffIdentity,
      eq(organizationStaffIdentity.id, member.staffIdentityId),
    )
    .where(
      and(
        eq(member.organizationId, actor.organizationId),
        eq(member.userId, actor.userId),
      ),
    )
    .limit(1);

  const locationMembershipPromise = actor.locationId
    ? db
        .select({
          locationId: location.id,
          role: locationMember.role,
          identityStatus: locationStaffIdentity.status,
        })
        .from(location)
        .leftJoin(
          locationMember,
          and(
            eq(locationMember.locationId, location.id),
            eq(locationMember.userId, actor.userId),
          ),
        )
        .leftJoin(
          locationStaffIdentity,
          eq(locationStaffIdentity.id, locationMember.staffIdentityId),
        )
        .where(
          and(
            eq(location.id, actor.locationId),
            eq(location.organizationId, actor.organizationId),
          ),
        )
        .limit(1)
    : Promise.resolve([]);

  const [organizationMemberships, locationMemberships] = await Promise.all([
    organizationMembershipPromise,
    locationMembershipPromise,
  ]);

  if (actor.locationId && !locationMemberships[0]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The active location is not available in this organization.",
    });
  }

  const organizationRole = organizationMemberships[0]?.role ?? null;
  const locationRole = locationMemberships[0]?.role ?? null;
  const identityBlocked = isStaffIdentityAccessBlocked([
    organizationMemberships[0]?.identityStatus,
    locationMemberships[0]?.identityStatus,
  ]);

  return {
    organizationId: actor.organizationId,
    locationId: actor.locationId,
    organizationRole,
    locationRole,
    capabilities: identityBlocked
      ? []
      : resolveRoleCapabilities({
          organizationRole,
          locationRole,
        }),
  };
}

export async function requireCapability(input: {
  actor: CapabilityActorContext;
  capability: Capability;
  resource?: ResourceAuthorizationScope;
}): Promise<ActorCapabilitySnapshot> {
  const snapshot = await getActorCapabilitySnapshot(input.actor);
  const decision = evaluateCapabilityAccess({
    actor: snapshot,
    capability: input.capability,
    resource: input.resource,
  });

  if (decision.allowed) {
    return snapshot;
  }

  if (decision.reason === "NO_ACTIVE_ORGANIZATION") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before performing this action.",
    });
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to perform this action.",
  });
}

export async function requireOrganizationCapability(input: {
  actor: CapabilityActorContext;
  capability: Capability;
}): Promise<ActorCapabilitySnapshot> {
  const snapshot = await getActorCapabilitySnapshot(input.actor);
  if (
    organizationRoleHasCapability(
      snapshot.organizationRole,
      input.capability,
    ) &&
    snapshot.capabilities.includes(input.capability)
  ) {
    return snapshot;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "This action requires organization-level permission.",
  });
}
