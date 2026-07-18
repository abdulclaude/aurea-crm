import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { staffIdentity } from "@/db/schema";
import type { StaffIdentitySourceType } from "@/features/staff-identities/contracts";
import {
  canAttachIdentityUser,
  normalizeStaffIdentityEmail,
} from "@/features/staff-identities/lib/identity-policy";
import {
  staffIdentityVisibilityCondition,
  type StaffIdentityScope,
} from "@/features/staff-identities/server/scope";
import { attachStaffIdentitySource } from "@/features/staff-identities/server/source-attachment";
import { getStaffIdentitySourceSnapshot } from "@/features/staff-identities/server/source-snapshot";

export async function linkStaffIdentitySource(input: {
  scope: StaffIdentityScope;
  actorId: string;
  sourceType: StaffIdentitySourceType;
  sourceId: string;
  identityId: string | null;
}): Promise<{ identityId: string }> {
  return db.transaction(async (tx) => {
    const source = await getStaffIdentitySourceSnapshot({
      tx,
      scope: input.scope,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
    if (source.identityId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This source is already linked to a staff identity.",
      });
    }

    const now = new Date();
    const identityId = input.identityId ?? createId();
    const [existingIdentity] = input.identityId
      ? await tx
          .select({
            id: staffIdentity.id,
            userId: staffIdentity.userId,
          })
          .from(staffIdentity)
          .where(
            and(
              eq(staffIdentity.id, input.identityId),
              eq(staffIdentity.organizationId, input.scope.organizationId),
              ne(staffIdentity.status, "ARCHIVED"),
              staffIdentityVisibilityCondition(input.scope),
            ),
          )
          .limit(1)
      : [];

    if (input.identityId && !existingIdentity) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Staff identity not found.",
      });
    }
    if (
      existingIdentity &&
      !canAttachIdentityUser({
        identityUserId: existingIdentity.userId,
        sourceUserId: source.userId,
      })
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This source belongs to a different authenticated user.",
      });
    }

    if (!existingIdentity) {
      await tx.insert(staffIdentity).values({
        id: identityId,
        organizationId: input.scope.organizationId,
        userId: source.userId,
        displayName: source.displayName,
        email: source.email,
        normalizedEmail: normalizeStaffIdentityEmail(source.email),
        phone: source.phone,
        status: source.sourceType === "INVITATION" ? "INVITED" : "ACTIVE",
        createdById: input.actorId,
        updatedById: input.actorId,
        createdAt: now,
        updatedAt: now,
      });
    } else if (!existingIdentity.userId && source.userId) {
      await tx
        .update(staffIdentity)
        .set({
          userId: source.userId,
          updatedById: input.actorId,
          updatedAt: now,
        })
        .where(eq(staffIdentity.id, existingIdentity.id));
    }

    await attachStaffIdentitySource({ tx, source, identityId });
    return { identityId };
  });
}
