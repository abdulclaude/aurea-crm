import "server-only";

import { TRPCError } from "@trpc/server";
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
import type { StaffIdentitySourceType } from "@/features/staff-identities/contracts";
import type { StaffIdentityScope } from "@/features/staff-identities/server/scope";

export type StaffIdentityTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type StaffIdentitySourceSnapshot = {
  sourceType: StaffIdentitySourceType;
  sourceId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  identityId: string | null;
};

function assertOrganizationLevelSource(scope: StaffIdentityScope): void {
  if (scope.locationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization access can only be linked at workspace level.",
    });
  }
}

export async function getStaffIdentitySourceSnapshot(input: {
  tx: StaffIdentityTransaction;
  scope: StaffIdentityScope;
  sourceType: StaffIdentitySourceType;
  sourceId: string;
}): Promise<StaffIdentitySourceSnapshot> {
  if (input.sourceType === "ORGANIZATION_MEMBER") {
    assertOrganizationLevelSource(input.scope);
    const [row] = await input.tx
      .select({
        sourceId: member.id,
        displayName: user.name,
        email: user.email,
        userId: member.userId,
        identityId: member.staffIdentityId,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(
        and(
          eq(member.id, input.sourceId),
          eq(member.organizationId, input.scope.organizationId),
        ),
      )
      .limit(1);
    if (row) return { ...row, phone: null, sourceType: input.sourceType };
  }

  if (input.sourceType === "INVITATION") {
    assertOrganizationLevelSource(input.scope);
    const [row] = await input.tx
      .select({
        sourceId: invitation.id,
        email: invitation.email,
        identityId: invitation.staffIdentityId,
      })
      .from(invitation)
      .where(
        and(
          eq(invitation.id, input.sourceId),
          eq(invitation.organizationId, input.scope.organizationId),
        ),
      )
      .limit(1);
    if (row) {
      return {
        ...row,
        displayName: row.email,
        phone: null,
        userId: null,
        sourceType: input.sourceType,
      };
    }
  }

  if (input.sourceType === "LOCATION_MEMBER") {
    const [row] = await input.tx
      .select({
        sourceId: locationMember.id,
        displayName: user.name,
        email: user.email,
        userId: locationMember.userId,
        identityId: locationMember.staffIdentityId,
      })
      .from(locationMember)
      .innerJoin(location, eq(location.id, locationMember.locationId))
      .innerJoin(user, eq(user.id, locationMember.userId))
      .where(
        and(
          eq(locationMember.id, input.sourceId),
          eq(location.organizationId, input.scope.organizationId),
          input.scope.locationId
            ? eq(locationMember.locationId, input.scope.locationId)
            : undefined,
        ),
      )
      .limit(1);
    if (row) return { ...row, phone: null, sourceType: input.sourceType };
  }

  if (input.sourceType === "INSTRUCTOR") {
    const [row] = await input.tx
      .select({
        sourceId: instructor.id,
        displayName: instructor.name,
        email: instructor.email,
        phone: instructor.phone,
        userId: instructor.userId,
        identityId: instructor.staffIdentityId,
      })
      .from(instructor)
      .where(
        and(
          eq(instructor.id, input.sourceId),
          eq(instructor.organizationId, input.scope.organizationId),
          input.scope.locationId
            ? eq(instructor.locationId, input.scope.locationId)
            : undefined,
        ),
      )
      .limit(1);
    if (row) return { ...row, sourceType: input.sourceType };
  }

  if (input.sourceType === "STUDIO_STAFF") {
    const [row] = await input.tx
      .select({
        sourceId: studioStaffMember.id,
        displayName: studioStaffMember.name,
        email: studioStaffMember.email,
        phone: studioStaffMember.phone,
        identityId: studioStaffMember.staffIdentityId,
      })
      .from(studioStaffMember)
      .where(
        and(
          eq(studioStaffMember.id, input.sourceId),
          eq(studioStaffMember.organizationId, input.scope.organizationId),
          input.scope.locationId
            ? eq(studioStaffMember.locationId, input.scope.locationId)
            : undefined,
          isNull(studioStaffMember.deletedAt),
        ),
      )
      .limit(1);
    if (row) return { ...row, userId: null, sourceType: input.sourceType };
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Staff source not found.",
  });
}
