import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  form,
  publicationTarget,
  publicationVersion,
} from "@/db/schema";
import { publicationConsentConfigSchema } from "@/features/publications/contracts";
import {
  publishedFormSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";

export async function getPublishedFormSubmissionSource(input: {
  targetId: string;
  versionId: string;
  formId: string;
}) {
  const [row] = await db
    .select({
      consentSnapshot: publicationVersion.consentSnapshot,
      locationId: publicationTarget.locationId,
      organizationId: publicationTarget.organizationId,
      snapshot: publicationVersion.snapshot,
      targetId: publicationTarget.id,
      versionId: publicationVersion.id,
      formId: form.id,
    })
    .from(publicationTarget)
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .innerJoin(
      form,
      and(
        eq(form.id, publicationTarget.sourceId),
        eq(form.organizationId, publicationTarget.organizationId),
        or(
          eq(form.locationId, publicationTarget.locationId),
          and(isNull(form.locationId), isNull(publicationTarget.locationId)),
        ),
      ),
    )
    .where(
      and(
        eq(publicationTarget.id, input.targetId),
        eq(publicationTarget.kind, "FORM"),
        eq(publicationTarget.status, "PUBLISHED"),
        eq(publicationVersion.id, input.versionId),
        eq(form.id, input.formId),
      ),
    )
    .limit(1);
  if (!row) return null;

  const envelope = storedPublicationSnapshotSchema.safeParse(row.snapshot);
  const consent = publicationConsentConfigSchema.safeParse(row.consentSnapshot);
  if (
    !envelope.success ||
    envelope.data.channelConfig.kind !== "FORM" ||
    envelope.data.channelConfig.submissionMode !== "ENABLED" ||
    !consent.success ||
    !consent.data.privacyPolicyUrl
  ) {
    return null;
  }
  const source = publishedFormSourceSchema.safeParse(envelope.data.source);
  if (
    !source.success ||
    source.data.form?.id !== row.formId ||
    source.data.form.locationId !== row.locationId
  ) {
    return null;
  }
  return {
    channel: envelope.data.channelConfig,
    consent: consent.data,
    form: source.data.form,
    source: source.data,
    locationId: row.locationId,
    organizationId: row.organizationId,
    targetId: row.targetId,
    versionId: row.versionId,
  };
}
