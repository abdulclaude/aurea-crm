import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import {
  instructor,
  invitation,
  locationMember,
  member,
  studioStaffMember,
} from "@/db/schema";
import type {
  StaffIdentitySourceSnapshot,
  StaffIdentityTransaction,
} from "@/features/staff-identities/server/source-snapshot";

export async function attachStaffIdentitySource(input: {
  tx: StaffIdentityTransaction;
  source: StaffIdentitySourceSnapshot;
  identityId: string;
}): Promise<void> {
  let linked: { id: string }[] = [];

  switch (input.source.sourceType) {
    case "ORGANIZATION_MEMBER":
      linked = await input.tx
        .update(member)
        .set({ staffIdentityId: input.identityId })
        .where(
          and(
            eq(member.id, input.source.sourceId),
            isNull(member.staffIdentityId),
          ),
        )
        .returning({ id: member.id });
      break;
    case "INVITATION":
      linked = await input.tx
        .update(invitation)
        .set({ staffIdentityId: input.identityId })
        .where(
          and(
            eq(invitation.id, input.source.sourceId),
            isNull(invitation.staffIdentityId),
          ),
        )
        .returning({ id: invitation.id });
      break;
    case "LOCATION_MEMBER":
      linked = await input.tx
        .update(locationMember)
        .set({ staffIdentityId: input.identityId })
        .where(
          and(
            eq(locationMember.id, input.source.sourceId),
            isNull(locationMember.staffIdentityId),
          ),
        )
        .returning({ id: locationMember.id });
      break;
    case "INSTRUCTOR":
      linked = await input.tx
        .update(instructor)
        .set({ staffIdentityId: input.identityId })
        .where(
          and(
            eq(instructor.id, input.source.sourceId),
            isNull(instructor.staffIdentityId),
          ),
        )
        .returning({ id: instructor.id });
      break;
    case "STUDIO_STAFF":
      linked = await input.tx
        .update(studioStaffMember)
        .set({ staffIdentityId: input.identityId })
        .where(
          and(
            eq(studioStaffMember.id, input.source.sourceId),
            isNull(studioStaffMember.staffIdentityId),
          ),
        )
        .returning({ id: studioStaffMember.id });
      break;
  }

  if (!linked[0]) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This source was linked by another update. Refresh and try again.",
    });
  }
}
