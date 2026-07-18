import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { staffIdentity } from "@/db/schema";
import type { StaffIdentityDirectory } from "@/features/staff-identities/contracts";
import { getLinkedStaffIdentitySources } from "@/features/staff-identities/server/linked-sources";
import {
  staffIdentityVisibilityCondition,
  type StaffIdentityScope,
} from "@/features/staff-identities/server/scope";
import { getUnlinkedStaffIdentitySources } from "@/features/staff-identities/server/unlinked-sources";

export async function getStaffIdentityDirectory(
  scope: StaffIdentityScope,
): Promise<StaffIdentityDirectory> {
  const identities = await db
    .select({
      id: staffIdentity.id,
      displayName: staffIdentity.displayName,
      email: staffIdentity.email,
      phone: staffIdentity.phone,
      userId: staffIdentity.userId,
      status: staffIdentity.status,
      createdAt: staffIdentity.createdAt,
      updatedAt: staffIdentity.updatedAt,
    })
    .from(staffIdentity)
    .where(
      and(
        eq(staffIdentity.organizationId, scope.organizationId),
        staffIdentityVisibilityCondition(scope),
      ),
    )
    .orderBy(asc(staffIdentity.displayName))
    .limit(250);

  const [sources, unlinked] = await Promise.all([
    getLinkedStaffIdentitySources(
      scope,
      identities.map((identity) => identity.id),
    ),
    getUnlinkedStaffIdentitySources(scope),
  ]);

  return {
    identities: identities.map((identity) => ({
      ...identity,
      sources: sources.get(identity.id) ?? [],
    })),
    unlinked,
  };
}
