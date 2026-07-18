import "server-only";

import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { locationMember, member, staffIdentity } from "@/db/schema";
import { isStaffIdentityAccessBlocked } from "@/features/staff-identities/lib/identity-policy";

const organizationIdentity = alias(staffIdentity, "actorOrganizationIdentity");
const locationIdentity = alias(staffIdentity, "actorLocationIdentity");

export async function isActorStaffAccessBlocked(input: {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
}): Promise<boolean> {
  if (!input.organizationId) return false;

  const organizationStatusQuery = db
    .select({ status: organizationIdentity.status })
    .from(member)
    .leftJoin(
      organizationIdentity,
      eq(organizationIdentity.id, member.staffIdentityId),
    )
    .where(
      and(
        eq(member.organizationId, input.organizationId),
        eq(member.userId, input.userId),
      ),
    )
    .limit(1);
  const locationStatusQuery = input.locationId
    ? db
        .select({ status: locationIdentity.status })
        .from(locationMember)
        .leftJoin(
          locationIdentity,
          eq(locationIdentity.id, locationMember.staffIdentityId),
        )
        .where(
          and(
            eq(locationMember.locationId, input.locationId),
            eq(locationMember.userId, input.userId),
          ),
        )
        .limit(1)
    : Promise.resolve([]);
  const [organizationRows, locationRows] = await Promise.all([
    organizationStatusQuery,
    locationStatusQuery,
  ]);

  return isStaffIdentityAccessBlocked([
    organizationRows[0]?.status,
    locationRows[0]?.status,
  ]);
}
