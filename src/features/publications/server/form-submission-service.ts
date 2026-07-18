import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, or } from "drizzle-orm";

import { db } from "@/db";
import {
  formSubmission,
  publicationTarget,
  publicFormSubmissionReceipt,
} from "@/db/schema";
import type { PublicationConsentConfig } from "@/features/publications/contracts";
import { validatePublicFormValues } from "@/features/forms-builder/lib/public-form-validation";
import {
  canonicalPublicationValue,
  createPublicationContentHash,
} from "@/features/publications/lib/content-hash";
import {
  readStoredPublicationConsentDecision,
  type StoredPublicationConsentDecision,
} from "@/features/publications/public/consent";
import { fingerprintPublicFormSubmissionToken } from "@/features/publications/public/form-submission-token";
import type { PublishedFormSource } from "@/features/forms-builder/lib/public-form-contract";
import { publicFormResponseExpiry } from "@/features/forms-builder/lib/form-retention";
import { formCrmResolutionIsEnabled } from "@/features/forms-builder/lib/form-crm-resolution";

export class PublicFormSubmissionConflictError extends Error {}
export class PublicFormSubmissionStaleError extends Error {}
export class PublicFormSubmissionValidationError extends Error {
  constructor(
    public readonly fieldErrors: Record<string, string>,
    public readonly formErrors: string[],
  ) {
    super("The form response is invalid.");
  }
}

export type AcceptedPublicFormSubmission = {
  receiptId: string;
  submissionId: string;
  replayed: boolean;
  workflowPending: boolean;
};

export async function acceptPublicFormSubmission(input: {
  targetId: string;
  versionId: string;
  organizationId: string;
  locationId: string | null;
  formId: string;
  source: PublishedFormSource;
  values: Record<string, unknown>;
  idempotencyKey: string;
  submissionToken: string;
  consentPolicy: PublicationConsentConfig;
  responseConsentLabel: string;
  responseRetentionDays: number;
  trackingConsentCookie: string | undefined;
  globalPrivacyControl: boolean;
}): Promise<AcceptedPublicFormSubmission> {
  const validation = validatePublicFormValues(input.source, input.values);
  if (!validation.success) {
    throw new PublicFormSubmissionValidationError(
      validation.fieldErrors,
      validation.formErrors,
    );
  }
  const workflowId = input.source.form?.workflowId ?? null;
  const payloadHash = createPublicationContentHash({
    targetId: input.targetId,
    versionId: input.versionId,
    values: input.values,
    responseConsent: true,
  });
  const tokenFingerprint = fingerprintPublicFormSubmissionToken(
    input.submissionToken,
  );
  const consentSnapshot = buildSubmissionConsentSnapshot({
    policy: input.consentPolicy,
    responseConsentLabel: input.responseConsentLabel,
    trackingDecision: readStoredPublicationConsentDecision(
      input.trackingConsentCookie,
    ),
    globalPrivacyControl: input.globalPrivacyControl,
  });

  return db.transaction(async (transaction) => {
    const [currentTarget] = await transaction
      .select({
        organizationId: publicationTarget.organizationId,
        locationId: publicationTarget.locationId,
        publishedVersionId: publicationTarget.publishedVersionId,
        status: publicationTarget.status,
      })
      .from(publicationTarget)
      .where(eq(publicationTarget.id, input.targetId))
      .limit(1)
      .for("share");
    if (
      !currentTarget ||
      currentTarget.status !== "PUBLISHED" ||
      currentTarget.publishedVersionId !== input.versionId ||
      currentTarget.organizationId !== input.organizationId ||
      currentTarget.locationId !== input.locationId
    ) {
      throw new PublicFormSubmissionStaleError(
        "The published form version is no longer current.",
      );
    }

    const receiptId = createId();
    const [insertedReceipt] = await transaction
      .insert(publicFormSubmissionReceipt)
      .values({
        id: receiptId,
        organizationId: input.organizationId,
        locationId: input.locationId,
        targetId: input.targetId,
        versionId: input.versionId,
        formId: input.formId,
        idempotencyKey: input.idempotencyKey,
        submissionTokenFingerprint: tokenFingerprint,
        payloadHash,
        consentSnapshot,
        workflowId,
        workflowDispatchStatus: workflowId ? "PENDING" : "NOT_CONFIGURED",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: publicFormSubmissionReceipt.id });

    if (!insertedReceipt) {
      const [existing] = await transaction
        .select({
          id: publicFormSubmissionReceipt.id,
          idempotencyKey: publicFormSubmissionReceipt.idempotencyKey,
          payloadHash: publicFormSubmissionReceipt.payloadHash,
          submissionTokenFingerprint:
            publicFormSubmissionReceipt.submissionTokenFingerprint,
          workflowDispatchStatus:
            publicFormSubmissionReceipt.workflowDispatchStatus,
          submissionId: formSubmission.id,
        })
        .from(publicFormSubmissionReceipt)
        .leftJoin(
          formSubmission,
          eq(formSubmission.receiptId, publicFormSubmissionReceipt.id),
        )
        .where(
          and(
            eq(publicFormSubmissionReceipt.targetId, input.targetId),
            or(
              and(
                eq(publicFormSubmissionReceipt.versionId, input.versionId),
                eq(
                  publicFormSubmissionReceipt.idempotencyKey,
                  input.idempotencyKey,
                ),
              ),
              eq(
                publicFormSubmissionReceipt.submissionTokenFingerprint,
                tokenFingerprint,
              ),
            ),
          ),
        )
        .limit(1);
      if (
        !existing ||
        !existing.submissionId ||
        existing.idempotencyKey !== input.idempotencyKey ||
        existing.payloadHash !== payloadHash ||
        existing.submissionTokenFingerprint !== tokenFingerprint
      ) {
        throw new PublicFormSubmissionConflictError(
          "The submission token or idempotency key has already been used.",
        );
      }
      return {
        receiptId: existing.id,
        submissionId: existing.submissionId,
        replayed: true,
        workflowPending: existing.workflowDispatchStatus === "PENDING",
      };
    }

    const submissionId = createId();
    const submittedAt = new Date();
    const retentionExpiresAt = publicFormResponseExpiry(
      submittedAt,
      input.responseRetentionDays,
    );
    const crmResolutionConfig = input.source.form?.crmResolutionConfig ?? {
      enabled: false,
    };
    const automationConfig = input.source.form?.automationConfig ?? {
      version: 1,
      emailMarketingConsentFieldId: null,
      smsMarketingConsentFieldId: null,
      followUpConsentFieldId: null,
    };
    await transaction.insert(formSubmission).values({
      id: submissionId,
      formId: input.formId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      publicationTargetId: input.targetId,
      publicationVersionId: input.versionId,
      receiptId,
      consentSnapshot,
      data: canonicalPublicationValue(input.values),
      crmResolutionConfig,
      automationConfig,
      clientResolutionStatus: formCrmResolutionIsEnabled(crmResolutionConfig)
        ? "PENDING"
        : "NOT_CONFIGURED",
      triggerDispatchStatus: "PENDING",
      submittedAt,
      retentionExpiresAt,
    });
    return {
      receiptId,
      submissionId,
      replayed: false,
      workflowPending: workflowId !== null,
    };
  });
}

function buildSubmissionConsentSnapshot(input: {
  policy: PublicationConsentConfig;
  responseConsentLabel: string;
  trackingDecision: StoredPublicationConsentDecision | null;
  globalPrivacyControl: boolean;
}) {
  const trackingDecisionIsCurrent =
    input.trackingDecision?.version === input.policy.version;
  return canonicalPublicationValue({
    schemaVersion: 1,
    response: {
      acknowledged: true,
      acknowledgedAt: new Date(),
      label: input.responseConsentLabel,
      privacyPolicyUrl: input.policy.privacyPolicyUrl,
    },
    tracking: {
      policy: input.policy,
      decision: trackingDecisionIsCurrent ? input.trackingDecision : null,
      globalPrivacyControl: input.globalPrivacyControl,
    },
  });
}
