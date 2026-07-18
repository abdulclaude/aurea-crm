import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  instructor,
  invitation,
  location,
  locationMember,
  member,
  studioStaffMember,
  user,
} from "@/db/schema";
import type { StaffIdentitySource } from "@/features/staff-identities/contracts";
import type { StaffIdentityScope } from "@/features/staff-identities/server/scope";

function addSource(
  sources: Map<string, StaffIdentitySource[]>,
  identityId: string | null,
  source: StaffIdentitySource,
): void {
  if (!identityId) return;
  sources.set(identityId, [...(sources.get(identityId) ?? []), source]);
}

export async function getLinkedStaffIdentitySources(
  scope: StaffIdentityScope,
  identityIds: string[],
): Promise<Map<string, StaffIdentitySource[]>> {
  const sources = new Map<string, StaffIdentitySource[]>();
  if (identityIds.length === 0) return sources;

  const [
    organizationRows,
    locationRows,
    instructorRows,
    staffRows,
    inviteRows,
  ] = await Promise.all([
    scope.locationId
      ? Promise.resolve([])
      : db
          .select({
            sourceId: member.id,
            identityId: member.staffIdentityId,
            role: member.role,
            displayName: user.name,
            email: user.email,
          })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(
            and(
              eq(member.organizationId, scope.organizationId),
              inArray(member.staffIdentityId, identityIds),
            ),
          ),
    db
      .select({
        sourceId: locationMember.id,
        identityId: locationMember.staffIdentityId,
        locationId: locationMember.locationId,
        locationName: location.companyName,
        role: locationMember.role,
        displayName: user.name,
        email: user.email,
      })
      .from(locationMember)
      .innerJoin(location, eq(location.id, locationMember.locationId))
      .innerJoin(user, eq(user.id, locationMember.userId))
      .where(
        and(
          eq(location.organizationId, scope.organizationId),
          scope.locationId
            ? eq(locationMember.locationId, scope.locationId)
            : undefined,
          inArray(locationMember.staffIdentityId, identityIds),
        ),
      ),
    db
      .select({
        sourceId: instructor.id,
        identityId: instructor.staffIdentityId,
        locationId: instructor.locationId,
        role: instructor.role,
        status: instructor.isActive,
        displayName: instructor.name,
        email: instructor.email,
      })
      .from(instructor)
      .where(
        and(
          eq(instructor.organizationId, scope.organizationId),
          scope.locationId
            ? eq(instructor.locationId, scope.locationId)
            : undefined,
          inArray(instructor.staffIdentityId, identityIds),
        ),
      ),
    db
      .select({
        sourceId: studioStaffMember.id,
        identityId: studioStaffMember.staffIdentityId,
        locationId: studioStaffMember.locationId,
        role: studioStaffMember.role,
        staffType: studioStaffMember.staffType,
        status: studioStaffMember.isActive,
        displayName: studioStaffMember.name,
        email: studioStaffMember.email,
      })
      .from(studioStaffMember)
      .where(
        and(
          eq(studioStaffMember.organizationId, scope.organizationId),
          scope.locationId
            ? eq(studioStaffMember.locationId, scope.locationId)
            : undefined,
          isNull(studioStaffMember.deletedAt),
          inArray(studioStaffMember.staffIdentityId, identityIds),
        ),
      ),
    scope.locationId
      ? Promise.resolve([])
      : db
          .select({
            sourceId: invitation.id,
            identityId: invitation.staffIdentityId,
            role: invitation.role,
            status: invitation.status,
            email: invitation.email,
          })
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, scope.organizationId),
              inArray(invitation.staffIdentityId, identityIds),
            ),
          ),
  ]);

  for (const row of organizationRows) {
    addSource(sources, row.identityId, {
      sourceType: "ORGANIZATION_MEMBER",
      sourceId: row.sourceId,
      locationId: null,
      label: "Workspace access",
      role: row.role,
      status: "ACTIVE",
      displayName: row.displayName,
      email: row.email,
    });
  }
  for (const row of locationRows) {
    addSource(sources, row.identityId, {
      sourceType: "LOCATION_MEMBER",
      sourceId: row.sourceId,
      locationId: row.locationId,
      label: row.locationName,
      role: row.role,
      status: "ACTIVE",
      displayName: row.displayName,
      email: row.email,
    });
  }
  for (const row of instructorRows) {
    addSource(sources, row.identityId, {
      sourceType: "INSTRUCTOR",
      sourceId: row.sourceId,
      locationId: row.locationId,
      label: "Instructor profile",
      role: row.role,
      status: row.status ? "ACTIVE" : "INACTIVE",
      displayName: row.displayName,
      email: row.email,
    });
  }
  for (const row of staffRows) {
    addSource(sources, row.identityId, {
      sourceType: "STUDIO_STAFF",
      sourceId: row.sourceId,
      locationId: row.locationId,
      label: row.staffType,
      role: row.role,
      status: row.status ? "ACTIVE" : "INACTIVE",
      displayName: row.displayName,
      email: row.email,
    });
  }
  for (const row of inviteRows) {
    addSource(sources, row.identityId, {
      sourceType: "INVITATION",
      sourceId: row.sourceId,
      locationId: null,
      label: "Invitation",
      role: row.role,
      status: row.status,
      displayName: row.email,
      email: row.email,
    });
  }

  return sources;
}
