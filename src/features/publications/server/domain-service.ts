import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { publicationTarget } from "@/db/schema";
import { verifyPublicationDomain } from "@/features/publications/lib/domain-verification";
import {
  getScopedPublicationTarget,
  PUBLICATION_TARGET_FIELDS,
} from "@/features/publications/server/access";

export async function checkPublicationDomain(input: {
  actorId: string;
  organizationId: string;
  locationId: string | null;
  id: string;
}): Promise<typeof publicationTarget.$inferSelect> {
  const target = await getScopedPublicationTarget(input);
  if (!target.domainHost) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Add a custom domain before checking its DNS record.",
    });
  }

  const result = await verifyPublicationDomain({
    host: target.domainHost,
    token: target.domainVerificationToken,
  });
  const [updated] = await db
    .update(publicationTarget)
    .set({
      domainStatus: result.ownershipVerified ? "VERIFIED" : "ERROR",
      sslStatus: result.ownershipVerified
        ? result.tlsActive
          ? "ACTIVE"
          : "ERROR"
        : "NOT_CONFIGURED",
      domainCheckedAt: new Date(),
      domainError: result.error,
      updatedById: input.actorId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(publicationTarget.id, target.id),
        eq(publicationTarget.organizationId, input.organizationId),
        eq(publicationTarget.domainHost, target.domainHost),
        eq(
          publicationTarget.domainVerificationToken,
          target.domainVerificationToken,
        ),
      ),
    )
    .returning(PUBLICATION_TARGET_FIELDS);
  if (!updated) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "The domain configuration changed during verification.",
    });
  }
  return updated;
}

export function getPublicationDomainInstructions(
  target: typeof publicationTarget.$inferSelect,
): {
  host: string | null;
  recordType: "TXT";
  recordName: string | null;
  recordValue: string;
} {
  return {
    host: target.domainHost,
    recordType: "TXT",
    recordName: target.domainHost
      ? `_aurea-verification.${target.domainHost}`
      : null,
    recordValue: `aurea-verification=${target.domainVerificationToken}`,
  };
}
