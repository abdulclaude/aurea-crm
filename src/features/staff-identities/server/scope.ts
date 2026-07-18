import { and, eq, exists, isNull, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  instructor,
  locationMember,
  staffIdentity,
  studioStaffMember,
} from "@/db/schema";

export type StaffIdentityScope = {
  organizationId: string;
  locationId: string | null;
};

export function staffIdentityVisibilityCondition(
  scope: StaffIdentityScope,
): SQL | undefined {
  if (!scope.locationId) return undefined;

  return or(
    exists(
      db
        .select({ id: locationMember.id })
        .from(locationMember)
        .where(
          and(
            eq(locationMember.staffIdentityId, staffIdentity.id),
            eq(locationMember.locationId, scope.locationId),
          ),
        ),
    ),
    exists(
      db
        .select({ id: instructor.id })
        .from(instructor)
        .where(
          and(
            eq(instructor.staffIdentityId, staffIdentity.id),
            eq(instructor.organizationId, scope.organizationId),
            eq(instructor.locationId, scope.locationId),
          ),
        ),
    ),
    exists(
      db
        .select({ id: studioStaffMember.id })
        .from(studioStaffMember)
        .where(
          and(
            eq(studioStaffMember.staffIdentityId, staffIdentity.id),
            eq(studioStaffMember.organizationId, scope.organizationId),
            eq(studioStaffMember.locationId, scope.locationId),
            isNull(studioStaffMember.deletedAt),
          ),
        ),
    ),
  );
}
