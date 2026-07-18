import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  invitation,
  location,
  locationMember,
  member,
  staffIdentity,
} from "@/db/schema";
import type {
  LocationRole,
  OrganizationRole,
} from "@/features/permissions/role-matrix";
import { normalizeStaffIdentityEmail } from "@/features/staff-identities/lib/identity-policy";

type AcceptedUser = {
  id: string;
  name: string;
  email: string;
};

async function resolveAcceptedIdentity(input: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  organizationId: string;
  invitationIdentityId: string | null;
  membershipIdentityId: string | null;
  user: AcceptedUser;
}): Promise<string> {
  const [userIdentity] = await input.tx
    .select({ id: staffIdentity.id })
    .from(staffIdentity)
    .where(
      and(
        eq(staffIdentity.organizationId, input.organizationId),
        eq(staffIdentity.userId, input.user.id),
      ),
    )
    .limit(1);
  const identityId =
    input.membershipIdentityId ??
    userIdentity?.id ??
    input.invitationIdentityId ??
    createId();

  const [identity] = await input.tx
    .select({
      id: staffIdentity.id,
      userId: staffIdentity.userId,
      status: staffIdentity.status,
    })
    .from(staffIdentity)
    .where(
      and(
        eq(staffIdentity.id, identityId),
        eq(staffIdentity.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (identity?.userId && identity.userId !== input.user.id) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This invitation is linked to a different authenticated user.",
    });
  }
  if (identity?.status === "ARCHIVED") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This staff identity must be restored before accepting access.",
    });
  }

  const now = new Date();
  if (identity) {
    await input.tx
      .update(staffIdentity)
      .set({
        userId: input.user.id,
        displayName: input.user.name,
        email: input.user.email,
        normalizedEmail: normalizeStaffIdentityEmail(input.user.email),
        status: identity.status === "INVITED" ? "ACTIVE" : identity.status,
        updatedById: input.user.id,
        updatedAt: now,
      })
      .where(eq(staffIdentity.id, identity.id));
  } else {
    await input.tx.insert(staffIdentity).values({
      id: identityId,
      organizationId: input.organizationId,
      userId: input.user.id,
      displayName: input.user.name,
      email: input.user.email,
      normalizedEmail: normalizeStaffIdentityEmail(input.user.email),
      status: "ACTIVE",
      createdById: input.user.id,
      updatedById: input.user.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  return identityId;
}

export async function acceptStaffInvitation(input: {
  invitationId: string;
  organizationId: string;
  user: AcceptedUser;
  target:
    | { type: "organization"; role: OrganizationRole }
    | { type: "location"; role: LocationRole; locationId: string };
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [pendingInvitation] = await tx
      .select({
        id: invitation.id,
        identityId: invitation.staffIdentityId,
      })
      .from(invitation)
      .where(
        and(
          eq(invitation.id, input.invitationId),
          eq(invitation.organizationId, input.organizationId),
          eq(invitation.status, "pending"),
        ),
      )
      .for("update")
      .limit(1);
    if (!pendingInvitation) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This invitation is no longer available.",
      });
    }

    if (input.target.type === "organization") {
      const [existingMembership] = await tx
        .select({ id: member.id, identityId: member.staffIdentityId })
        .from(member)
        .where(
          and(
            eq(member.organizationId, input.organizationId),
            eq(member.userId, input.user.id),
          ),
        )
        .limit(1);
      const identityId = await resolveAcceptedIdentity({
        tx,
        organizationId: input.organizationId,
        invitationIdentityId: pendingInvitation.identityId,
        membershipIdentityId: existingMembership?.identityId ?? null,
        user: input.user,
      });
      if (existingMembership) {
        await tx
          .update(member)
          .set({ staffIdentityId: identityId })
          .where(eq(member.id, existingMembership.id));
      } else {
        await tx.insert(member).values({
          id: createId(),
          organizationId: input.organizationId,
          userId: input.user.id,
          role: input.target.role,
          staffIdentityId: identityId,
          createdAt: new Date(),
        });
      }
      await tx
        .update(invitation)
        .set({ status: "accepted", staffIdentityId: identityId })
        .where(eq(invitation.id, pendingInvitation.id));
      return;
    }

    const [ownedLocation] = await tx
      .select({ id: location.id })
      .from(location)
      .where(
        and(
          eq(location.id, input.target.locationId),
          eq(location.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (!ownedLocation) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "The invited location is not part of this organization.",
      });
    }
    const [existingMembership] = await tx
      .select({
        id: locationMember.id,
        identityId: locationMember.staffIdentityId,
      })
      .from(locationMember)
      .where(
        and(
          eq(locationMember.locationId, input.target.locationId),
          eq(locationMember.userId, input.user.id),
        ),
      )
      .limit(1);
    const identityId = await resolveAcceptedIdentity({
      tx,
      organizationId: input.organizationId,
      invitationIdentityId: pendingInvitation.identityId,
      membershipIdentityId: existingMembership?.identityId ?? null,
      user: input.user,
    });
    if (existingMembership) {
      await tx
        .update(locationMember)
        .set({ staffIdentityId: identityId, updatedAt: new Date() })
        .where(eq(locationMember.id, existingMembership.id));
    } else {
      await tx.insert(locationMember).values({
        id: createId(),
        locationId: input.target.locationId,
        userId: input.user.id,
        role: input.target.role,
        staffIdentityId: identityId,
        updatedAt: new Date(),
      });
    }
    await tx
      .update(invitation)
      .set({ status: "accepted", staffIdentityId: identityId })
      .where(eq(invitation.id, pendingInvitation.id));
  });
}
