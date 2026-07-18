import "server-only";

import { and, eq, isNull } from "drizzle-orm";

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

export async function getUnlinkedStaffIdentitySources(
  scope: StaffIdentityScope,
): Promise<StaffIdentitySource[]> {
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
            role: member.role,
            displayName: user.name,
            email: user.email,
          })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(
            and(
              eq(member.organizationId, scope.organizationId),
              isNull(member.staffIdentityId),
            ),
          )
          .limit(100),
    db
      .select({
        sourceId: locationMember.id,
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
          isNull(locationMember.staffIdentityId),
        ),
      )
      .limit(100),
    db
      .select({
        sourceId: instructor.id,
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
          isNull(instructor.staffIdentityId),
        ),
      )
      .limit(100),
    db
      .select({
        sourceId: studioStaffMember.id,
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
          isNull(studioStaffMember.staffIdentityId),
          isNull(studioStaffMember.deletedAt),
        ),
      )
      .limit(100),
    scope.locationId
      ? Promise.resolve([])
      : db
          .select({
            sourceId: invitation.id,
            role: invitation.role,
            status: invitation.status,
            email: invitation.email,
          })
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, scope.organizationId),
              isNull(invitation.staffIdentityId),
            ),
          )
          .limit(100),
  ]);

  return [
    ...organizationRows.map(
      (row): StaffIdentitySource => ({
        sourceType: "ORGANIZATION_MEMBER",
        sourceId: row.sourceId,
        locationId: null,
        label: "Workspace access",
        role: row.role,
        status: "ACTIVE",
        displayName: row.displayName,
        email: row.email,
      }),
    ),
    ...locationRows.map(
      (row): StaffIdentitySource => ({
        sourceType: "LOCATION_MEMBER",
        sourceId: row.sourceId,
        locationId: row.locationId,
        label: row.locationName,
        role: row.role,
        status: "ACTIVE",
        displayName: row.displayName,
        email: row.email,
      }),
    ),
    ...instructorRows.map(
      (row): StaffIdentitySource => ({
        sourceType: "INSTRUCTOR",
        sourceId: row.sourceId,
        locationId: row.locationId,
        label: "Instructor profile",
        role: row.role,
        status: row.status ? "ACTIVE" : "INACTIVE",
        displayName: row.displayName,
        email: row.email,
      }),
    ),
    ...staffRows.map(
      (row): StaffIdentitySource => ({
        sourceType: "STUDIO_STAFF",
        sourceId: row.sourceId,
        locationId: row.locationId,
        label: row.staffType,
        role: row.role,
        status: row.status ? "ACTIVE" : "INACTIVE",
        displayName: row.displayName,
        email: row.email,
      }),
    ),
    ...inviteRows.map(
      (row): StaffIdentitySource => ({
        sourceType: "INVITATION",
        sourceId: row.sourceId,
        locationId: null,
        label: "Invitation",
        role: row.role,
        status: row.status,
        displayName: row.email,
        email: row.email,
      }),
    ),
  ].sort((left, right) => left.displayName.localeCompare(right.displayName));
}
