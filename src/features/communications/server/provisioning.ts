import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/db";
import { communicationProvisioningOperation, emailDomain } from "@/db/schema";
import { communicationProvisioningSafeInputSchema } from "@/features/communications/contracts";
import { resendDnsRecordsSchema } from "@/features/communications/contracts";
import { resolveProviderAccount } from "@/features/provider-accounts/server/resolver";
import { inngest } from "@/inngest/client";
import { CommunicationProvisioningError } from "./provisioning-error";
import { runTwilioProvisioningOperation } from "./twilio-provisioning";

const LEASE_MS = 10 * 60_000;

export async function requestCommunicationProvisioning(
  organizationId?: string,
): Promise<void> {
  try {
    await inngest.send({
      name: "communications/provisioning.requested",
      data: { organizationId },
    });
  } catch (error) {
    console.error("Failed to request communications provisioning", {
      organizationId,
      error: error instanceof Error ? error.message : "Unknown Inngest error",
    });
  }
}

async function claimOperation(operationId: string) {
  const now = new Date();
  const claimToken = createId();
  const [claimed] = await db
    .update(communicationProvisioningOperation)
    .set({
      status: "PROCESSING",
      claimToken,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      attemptCount: sql`${communicationProvisioningOperation.attemptCount} + 1`,
      startedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(communicationProvisioningOperation.id, operationId),
        or(
          inArray(communicationProvisioningOperation.status, [
            "PENDING",
            "RETRYABLE_FAILURE",
            "AMBIGUOUS",
          ]),
          and(
            eq(communicationProvisioningOperation.status, "PROCESSING"),
            lte(communicationProvisioningOperation.leaseExpiresAt, now),
          ),
        ),
        or(
          isNull(communicationProvisioningOperation.nextAttemptAt),
          lte(communicationProvisioningOperation.nextAttemptAt, now),
        ),
      ),
    )
    .returning();
  return claimed ? { operation: claimed, claimToken } : null;
}

type Operation = typeof communicationProvisioningOperation.$inferSelect;
type DomainProvisioningValues = Partial<
  Pick<
    typeof emailDomain.$inferInsert,
    | "resendDomainId"
    | "dnsRecords"
    | "status"
    | "lifecycleState"
    | "isDisabled"
    | "isDefault"
    | "verifiedAt"
    | "lastCheckedAt"
    | "verificationStaleAt"
    | "removedAt"
    | "lastErrorCode"
    | "lastErrorMessage"
  >
>;
type ProvisioningResult = {
  externalResourceId: string | null;
  domainValues?: DomainProvisioningValues;
};

function providerError(error: { name?: string; message: string }) {
  const code = error.name ?? "RESEND_REJECTED";
  return new CommunicationProvisioningError(
    code,
    error.message,
    [
      "rate_limit_exceeded",
      "internal_server_error",
      "application_error",
    ].includes(code),
  );
}

async function loadDomain(operation: Operation) {
  if (!operation.emailDomainId) {
    throw new CommunicationProvisioningError(
      "DOMAIN_REFERENCE_MISSING",
      "The provisioning operation is not linked to an email domain.",
      false,
    );
  }
  const [domain] = await db
    .select()
    .from(emailDomain)
    .where(
      and(
        eq(emailDomain.id, operation.emailDomainId),
        eq(emailDomain.organizationId, operation.organizationId),
      ),
    )
    .limit(1);
  if (!domain?.providerAccountId) {
    throw new CommunicationProvisioningError(
      "DOMAIN_BINDING_MISSING",
      "The email domain is not linked to a managed Resend binding.",
      false,
    );
  }
  return domain;
}

async function runResendOperation(
  operation: Operation,
): Promise<ProvisioningResult> {
  const safeInput = communicationProvisioningSafeInputSchema.parse(
    operation.safeInput,
  );
  const domain = await loadDomain(operation);
  const account = await resolveProviderAccount({
    providerAccountId: domain.providerAccountId,
    provider: "RESEND",
    scope: {
      organizationId: domain.organizationId,
      locationId: domain.locationId,
    },
  });
  const resend = new Resend(account.secret);

  if (safeInput.kind === "RESEND_DOMAIN_CREATE") {
    if (domain.resendDomainId) {
      return { externalResourceId: domain.resendDomainId };
    }
    let after: string | undefined;
    let existing: { id: string; status: string } | undefined;
    for (let page = 0; page < 10 && !existing; page += 1) {
      const listed = await resend.domains.list({ limit: 100, after });
      if (listed.error) throw providerError(listed.error);
      existing = listed.data?.data.find(
        (candidate) => candidate.name.toLowerCase() === safeInput.domain,
      );
      const rows = listed.data?.data ?? [];
      if (!listed.data?.has_more || rows.length === 0) break;
      after = rows.at(-1)?.id;
      if (!after) break;
    }
    if (existing) {
      const capabilityUpdate = await resend.domains.update({
        id: existing.id,
        capabilities: { sending: "enabled", receiving: "enabled" },
      });
      if (capabilityUpdate.error) throw providerError(capabilityUpdate.error);
      const refreshed = await resend.domains.get(existing.id);
      if (refreshed.error) throw providerError(refreshed.error);
      return {
        externalResourceId: existing.id,
        domainValues: {
          resendDomainId: existing.id,
          dnsRecords: resendDnsRecordsSchema.parse(
            refreshed.data?.records ?? [],
          ),
          status:
            existing.status === "verified"
              ? "VERIFIED"
              : existing.status === "failed" ||
                  existing.status === "temporary_failure"
                ? "FAILED"
                : "PENDING",
          lifecycleState:
            existing.status === "verified"
              ? "ACTIVE"
              : existing.status === "failed" ||
                  existing.status === "temporary_failure"
                ? "DEGRADED"
                : "AWAITING_DNS",
          lastErrorCode:
            existing.status === "temporary_failure"
              ? "RESEND_DOMAIN_TEMPORARY_FAILURE"
              : null,
          lastErrorMessage:
            existing.status === "temporary_failure"
              ? "Resend reported a temporary domain verification failure."
              : null,
        },
      };
    }
    const response = await resend.domains.create(
      {
        name: safeInput.domain,
        capabilities: { sending: "enabled", receiving: "enabled" },
      },
      { headers: { "Idempotency-Key": operation.idempotencyKey } },
    );
    if (response.error) throw providerError(response.error);
    if (!response.data?.id) {
      throw new Error("Resend created a domain without returning its ID.");
    }
    return {
      externalResourceId: response.data.id,
      domainValues: {
        resendDomainId: response.data.id,
        dnsRecords: resendDnsRecordsSchema.parse(response.data.records ?? []),
        status: "PENDING" as const,
        lifecycleState: "AWAITING_DNS" as const,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    };
  }

  if (!domain.resendDomainId) {
    throw new CommunicationProvisioningError(
      "RESEND_DOMAIN_ID_MISSING",
      "The email domain has not been created in Resend.",
      false,
    );
  }
  if (safeInput.kind === "RESEND_DOMAIN_VERIFY") {
    const response = await resend.domains.verify(domain.resendDomainId);
    if (response.error) throw providerError(response.error);
    return {
      externalResourceId: domain.resendDomainId,
      domainValues: {
        status: "VERIFYING" as const,
        lifecycleState: "AWAITING_DNS" as const,
        lastCheckedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    };
  }
  if (safeInput.kind === "RESEND_DOMAIN_REFRESH") {
    const response = await resend.domains.get(domain.resendDomainId);
    if (response.error) throw providerError(response.error);
    const status =
      response.data?.status === "verified"
        ? "VERIFIED"
        : response.data?.status === "failed"
          ? "FAILED"
          : response.data?.status === "temporary_failure"
            ? "FAILED"
            : "VERIFYING";
    return {
      externalResourceId: domain.resendDomainId,
      domainValues: {
        status,
        lifecycleState:
          status === "VERIFIED"
            ? ("ACTIVE" as const)
            : status === "FAILED"
              ? ("FAILED" as const)
              : ("AWAITING_DNS" as const),
        dnsRecords: resendDnsRecordsSchema.parse(
          response.data?.records ?? domain.dnsRecords ?? [],
        ),
        verifiedAt: status === "VERIFIED" ? new Date() : null,
        verificationStaleAt: null,
        lastCheckedAt: new Date(),
        lastErrorCode:
          response.data?.status === "temporary_failure"
            ? "RESEND_DOMAIN_TEMPORARY_FAILURE"
            : null,
        lastErrorMessage:
          response.data?.status === "temporary_failure"
            ? "Resend reported a temporary domain verification failure. Check the DNS records and retry verification."
            : null,
      },
    };
  }
  if (safeInput.kind === "RESEND_DOMAIN_DELETE") {
    const response = await resend.domains.remove(domain.resendDomainId);
    if (response.error) throw providerError(response.error);
    return {
      externalResourceId: domain.resendDomainId,
      domainValues: {
        status: "FAILED" as const,
        lifecycleState: "RELEASED" as const,
        isDisabled: true,
        isDefault: false,
        removedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    };
  }
  throw new CommunicationProvisioningError(
    "OPERATION_INPUT_INVALID",
    "The provisioning input does not match a Resend domain operation.",
    false,
  );
}

async function markFailed(input: {
  operation: Operation;
  claimToken: string;
  error: unknown;
}): Promise<void> {
  const rejected =
    input.error instanceof CommunicationProvisioningError ? input.error : null;
  const retryable = rejected?.retryable ?? true;
  const exhausted = input.operation.attemptCount >= input.operation.maxAttempts;
  const status =
    exhausted || !retryable
      ? "FAILED"
      : rejected
        ? "RETRYABLE_FAILURE"
        : "AMBIGUOUS";
  const code = rejected?.code ?? "PROVIDER_REQUEST_AMBIGUOUS";
  const message =
    input.error instanceof Error
      ? input.error.message
      : "The provider operation failed with an unknown error.";
  const delayMinutes = Math.min(60, 2 ** input.operation.attemptCount);
  await db.transaction(async (tx) => {
    const [failedOperation] = await tx
      .update(communicationProvisioningOperation)
      .set({
        status,
        claimToken: null,
        leaseExpiresAt: null,
        nextAttemptAt:
          status === "FAILED"
            ? null
            : new Date(Date.now() + delayMinutes * 60_000),
        lastErrorCode: code,
        lastErrorMessage: message,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(communicationProvisioningOperation.id, input.operation.id),
          eq(communicationProvisioningOperation.claimToken, input.claimToken),
        ),
      )
      .returning({ id: communicationProvisioningOperation.id });
    if (failedOperation && input.operation.emailDomainId) {
      await tx
        .update(emailDomain)
        .set({
          lifecycleState: status === "FAILED" ? "FAILED" : "DEGRADED",
          lastErrorCode: code,
          lastErrorMessage: message,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailDomain.id, input.operation.emailDomainId),
            eq(emailDomain.organizationId, input.operation.organizationId),
          ),
        );
    }
  });
}

export async function processCommunicationProvisioningOperation(
  operationId: string,
): Promise<boolean> {
  const claimed = await claimOperation(operationId);
  if (!claimed) return false;
  try {
    const result: ProvisioningResult =
      claimed.operation.service === "RESEND_DOMAIN"
        ? await runResendOperation(claimed.operation)
        : await runTwilioProvisioningOperation(claimed.operation);
    await db.transaction(async (tx) => {
      const [ownedOperation] = await tx
        .select({ id: communicationProvisioningOperation.id })
        .from(communicationProvisioningOperation)
        .where(
          and(
            eq(
              communicationProvisioningOperation.id,
              claimed.operation.id,
            ),
            eq(
              communicationProvisioningOperation.claimToken,
              claimed.claimToken,
            ),
            eq(communicationProvisioningOperation.status, "PROCESSING"),
          ),
        )
        .limit(1)
        .for("update");
      if (!ownedOperation) return;
      if (claimed.operation.emailDomainId && result.domainValues) {
        await tx
          .update(emailDomain)
          .set({ ...result.domainValues, updatedAt: new Date() })
          .where(
            and(
              eq(emailDomain.id, claimed.operation.emailDomainId),
              eq(emailDomain.organizationId, claimed.operation.organizationId),
            ),
          );
        if (result.domainValues.lifecycleState === "ACTIVE") {
          await tx.execute(sql`
            UPDATE "EmailDomain" AS target
            SET "isDefault" = true, "updatedAt" = CURRENT_TIMESTAMP
            WHERE target."id" = ${claimed.operation.emailDomainId}
              AND target."organizationId" = ${claimed.operation.organizationId}
              AND NOT EXISTS (
                SELECT 1 FROM "EmailDomain" AS existing
                WHERE existing."organizationId" = target."organizationId"
                  AND existing."locationId" IS NOT DISTINCT FROM target."locationId"
                  AND existing."isDefault" = true
                  AND existing."isDisabled" = false
                  AND existing."lifecycleState" = 'ACTIVE'
              )
          `);
        }
      }
      await tx
        .update(communicationProvisioningOperation)
        .set({
          status: "SUCCEEDED",
          externalResourceId: result.externalResourceId,
          claimToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: null,
          completedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communicationProvisioningOperation.id, claimed.operation.id),
            eq(
              communicationProvisioningOperation.claimToken,
              claimed.claimToken,
            ),
          ),
        );
    });
    return true;
  } catch (error) {
    await markFailed({ ...claimed, error });
    return false;
  }
}

export async function processDueCommunicationProvisioning(input?: {
  organizationId?: string;
  limit?: number;
}): Promise<{ processed: number }> {
  const now = new Date();
  const operations = await db
    .select({ id: communicationProvisioningOperation.id })
    .from(communicationProvisioningOperation)
    .where(
      and(
        input?.organizationId
          ? eq(
              communicationProvisioningOperation.organizationId,
              input.organizationId,
            )
          : undefined,
        or(
          inArray(communicationProvisioningOperation.status, [
            "PENDING",
            "RETRYABLE_FAILURE",
            "AMBIGUOUS",
          ]),
          and(
            eq(communicationProvisioningOperation.status, "PROCESSING"),
            lte(communicationProvisioningOperation.leaseExpiresAt, now),
          ),
        ),
        or(
          isNull(communicationProvisioningOperation.nextAttemptAt),
          lte(communicationProvisioningOperation.nextAttemptAt, now),
        ),
      ),
    )
    .limit(input?.limit ?? 20);
  let processed = 0;
  for (const operation of operations) {
    if (await processCommunicationProvisioningOperation(operation.id)) {
      processed += 1;
    }
  }
  return { processed };
}
