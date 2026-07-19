import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  campaign,
  communicationProvisioningOperation,
  emailDomain,
  emailSenderAddress,
} from "@/db/schema";

const BLOCKING_CAMPAIGN_STATUSES = [
  "SCHEDULED",
  "QUEUED",
  "SENDING",
  "PAUSED",
] as const;

export async function requestEmailDomainRelease(input: {
  id: string;
  organizationId: string;
  locationId: string | null;
  requestedByUserId: string;
}): Promise<{ operationId: string | null; deletedLocally: boolean }> {
  const now = new Date();
  const idempotencyKey = `resend-domain:delete:${input.id}`;
  const result = await db.transaction(async (tx) => {
    const [domain] = await tx
      .select()
      .from(emailDomain)
      .where(
        and(
          eq(emailDomain.id, input.id),
          eq(emailDomain.organizationId, input.organizationId),
          input.locationId
            ? eq(emailDomain.locationId, input.locationId)
            : isNull(emailDomain.locationId),
        ),
      )
      .limit(1)
      .for("update");
    if (!domain) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
    }

    const [blockingCampaign] = await tx
      .select({ id: campaign.id })
      .from(campaign)
      .where(
        and(
          eq(campaign.organizationId, input.organizationId),
          eq(campaign.emailDomainId, domain.id),
          inArray(campaign.status, BLOCKING_CAMPAIGN_STATUSES),
        ),
      )
      .limit(1)
      .for("update");
    if (blockingCampaign) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Pause or cancel campaigns that are queued, scheduled, sending, or paused before deleting this domain.",
      });
    }

    if (
      !domain.providerAccountId &&
      (domain.resendDomainId || domain.ownershipMode === "PLATFORM_MANAGED")
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "This managed domain has no provider binding. Reconnect its Resend account before deleting it.",
      });
    }

    await tx
      .update(emailDomain)
      .set({
        isDisabled: true,
        isDefault: false,
        lifecycleState: "RELEASE_SCHEDULED",
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(emailDomain.id, domain.id),
          eq(emailDomain.organizationId, input.organizationId),
        ),
      );

    await tx
      .update(communicationProvisioningOperation)
      .set({
        status: "CANCELLED",
        claimToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        completedAt: now,
        lastErrorCode: "DOMAIN_RELEASE_REQUESTED",
        lastErrorMessage: "Superseded by the domain deletion request.",
        updatedAt: now,
      })
      .where(
        and(
          eq(
            communicationProvisioningOperation.organizationId,
            input.organizationId,
          ),
          eq(communicationProvisioningOperation.emailDomainId, domain.id),
          ne(communicationProvisioningOperation.operationType, "RELEASE"),
          inArray(communicationProvisioningOperation.status, [
            "PENDING",
            "RETRYABLE_FAILURE",
            "AMBIGUOUS",
            "FAILED",
          ]),
        ),
      );

    if (!domain.providerAccountId) {
      await tx
        .update(campaign)
        .set({ emailDomainId: null, updatedAt: now })
        .where(
          and(
            eq(campaign.organizationId, input.organizationId),
            eq(campaign.emailDomainId, domain.id),
          ),
        );
      await tx
        .delete(emailSenderAddress)
        .where(
          and(
            eq(emailSenderAddress.organizationId, input.organizationId),
            eq(emailSenderAddress.emailDomainId, domain.id),
          ),
        );
      await tx
        .update(communicationProvisioningOperation)
        .set({ emailDomainId: null, updatedAt: now })
        .where(
          and(
            eq(
              communicationProvisioningOperation.organizationId,
              input.organizationId,
            ),
            eq(communicationProvisioningOperation.emailDomainId, domain.id),
          ),
        );
      await tx
        .delete(emailDomain)
        .where(
          and(
            eq(emailDomain.id, domain.id),
            eq(emailDomain.organizationId, input.organizationId),
          ),
        );
      return { operationId: null, deletedLocally: true };
    }

    const [existingOperation] = await tx
      .select()
      .from(communicationProvisioningOperation)
      .where(
        and(
          eq(
            communicationProvisioningOperation.organizationId,
            input.organizationId,
          ),
          eq(communicationProvisioningOperation.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1)
      .for("update");

    if (existingOperation) {
      if (!["PENDING", "PROCESSING"].includes(existingOperation.status)) {
        await tx
          .update(communicationProvisioningOperation)
          .set({
            status: "PENDING",
            attemptCount: 0,
            claimToken: null,
            leaseExpiresAt: null,
            nextAttemptAt: now,
            externalResourceId: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            startedAt: null,
            completedAt: null,
            updatedAt: now,
          })
          .where(
            eq(communicationProvisioningOperation.id, existingOperation.id),
          );
      }
      return {
        operationId: existingOperation.id,
        deletedLocally: false,
      };
    }

    const operationId = createId();
    await tx.insert(communicationProvisioningOperation).values({
      id: operationId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      providerAccountId: domain.providerAccountId,
      emailDomainId: domain.id,
      service: "RESEND_DOMAIN",
      operationType: "RELEASE",
      idempotencyKey,
      safeInput: {
        kind: "RESEND_DOMAIN_DELETE",
        emailDomainId: domain.id,
      },
      requestedByUserId: input.requestedByUserId,
      nextAttemptAt: now,
    });
    return { operationId, deletedLocally: false };
  });

  return result;
}
