CREATE TYPE "public"."PublicFormWorkflowDispatchStatus" AS ENUM('NOT_CONFIGURED', 'PENDING', 'DISPATCHED', 'FAILED');
--> statement-breakpoint
CREATE UNIQUE INDEX "Workflows_organizationId_id_key" ON "Workflows" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "Form_organizationId_id_key" ON "Form" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicationTarget_organizationId_id_key" ON "PublicationTarget" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicationVersion_targetId_id_key" ON "PublicationVersion" USING btree ("targetId", "id");
--> statement-breakpoint
CREATE TABLE "PublicFormSubmissionReceipt" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "targetId" text NOT NULL,
  "versionId" text NOT NULL,
  "formId" text NOT NULL,
  "idempotencyKey" text NOT NULL,
  "submissionTokenFingerprint" text NOT NULL,
  "payloadHash" text NOT NULL,
  "consentSnapshot" jsonb NOT NULL,
  "workflowId" text,
  "workflowDispatchStatus" "PublicFormWorkflowDispatchStatus" DEFAULT 'NOT_CONFIGURED' NOT NULL,
  "workflowDispatchAttempts" integer DEFAULT 0 NOT NULL,
  "workflowDispatchError" text,
  "lastWorkflowAttemptAt" timestamp(3),
  "workflowDispatchedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "PublicFormSubmissionReceipt_hash_lengths_check" CHECK (char_length("submissionTokenFingerprint") = 64 AND char_length("payloadHash") = 64),
  CONSTRAINT "PublicFormSubmissionReceipt_idempotency_length_check" CHECK (char_length("idempotencyKey") BETWEEN 16 AND 128),
  CONSTRAINT "PublicFormSubmissionReceipt_attempts_check" CHECK ("workflowDispatchAttempts" BETWEEN 0 AND 10),
  CONSTRAINT "PublicFormSubmissionReceipt_workflow_status_check" CHECK (("workflowId" IS NULL AND "workflowDispatchStatus" = 'NOT_CONFIGURED') OR ("workflowId" IS NOT NULL AND "workflowDispatchStatus" <> 'NOT_CONFIGURED'))
);
--> statement-breakpoint
ALTER TABLE "PublicFormSubmissionReceipt" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicFormSubmissionReceipt_organizationId_id_key" ON "PublicFormSubmissionReceipt" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicFormSubmissionReceipt_target_version_idempotency_key" ON "PublicFormSubmissionReceipt" USING btree ("targetId", "versionId", "idempotencyKey");
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicFormSubmissionReceipt_target_token_key" ON "PublicFormSubmissionReceipt" USING btree ("targetId", "submissionTokenFingerprint");
--> statement-breakpoint
CREATE INDEX "PublicFormSubmissionReceipt_scope_createdAt_idx" ON "PublicFormSubmissionReceipt" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
CREATE INDEX "PublicFormSubmissionReceipt_dispatch_createdAt_idx" ON "PublicFormSubmissionReceipt" USING btree ("workflowDispatchStatus", "createdAt");
--> statement-breakpoint
ALTER TABLE "PublicFormSubmissionReceipt" ADD CONSTRAINT "PublicFormSubmissionReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicFormSubmissionReceipt" ADD CONSTRAINT "PublicFormSubmissionReceipt_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicFormSubmissionReceipt" ADD CONSTRAINT "PublicFormSubmissionReceipt_targetId_fkey" FOREIGN KEY ("organizationId", "targetId") REFERENCES "public"."PublicationTarget"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicFormSubmissionReceipt" ADD CONSTRAINT "PublicFormSubmissionReceipt_versionId_fkey" FOREIGN KEY ("targetId", "versionId") REFERENCES "public"."PublicationVersion"("targetId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicFormSubmissionReceipt" ADD CONSTRAINT "PublicFormSubmissionReceipt_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "public"."Form"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicFormSubmissionReceipt" ADD CONSTRAINT "PublicFormSubmissionReceipt_workflowId_fkey" FOREIGN KEY ("organizationId", "workflowId") REFERENCES "public"."Workflows"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "PublicationRequestQuota" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "targetId" text NOT NULL,
  "action" text NOT NULL,
  "dimension" text NOT NULL,
  "subjectKeyHash" text NOT NULL,
  "windowStartedAt" timestamp(3) NOT NULL,
  "windowSeconds" integer NOT NULL,
  "requestCount" integer DEFAULT 1 NOT NULL,
  "expiresAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "PublicationRequestQuota_values_check" CHECK (char_length("action") BETWEEN 1 AND 100 AND "dimension" IN ('SUBJECT', 'GLOBAL') AND char_length("subjectKeyHash") = 64 AND "windowSeconds" BETWEEN 1 AND 86400 AND "requestCount" > 0)
);
--> statement-breakpoint
ALTER TABLE "PublicationRequestQuota" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicationRequestQuota_counter_key" ON "PublicationRequestQuota" USING btree ("targetId", "action", "dimension", "subjectKeyHash", "windowStartedAt");
--> statement-breakpoint
CREATE INDEX "PublicationRequestQuota_expiresAt_idx" ON "PublicationRequestQuota" USING btree ("expiresAt");
--> statement-breakpoint
ALTER TABLE "PublicationRequestQuota" ADD CONSTRAINT "PublicationRequestQuota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationRequestQuota" ADD CONSTRAINT "PublicationRequestQuota_targetId_fkey" FOREIGN KEY ("organizationId", "targetId") REFERENCES "public"."PublicationTarget"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD COLUMN "organizationId" text;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD COLUMN "locationId" text;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD COLUMN "publicationTargetId" text;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD COLUMN "publicationVersionId" text;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD COLUMN "receiptId" text;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD COLUMN "consentSnapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD COLUMN "retentionExpiresAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD COLUMN "mirroredFormSubmissionId" text;
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD COLUMN "idempotencyKey" text;
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD COLUMN "payloadHash" text;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ExternalFormSubmission" external_submission
    JOIN "Form" form_record ON form_record."id" = external_submission."formId"
    WHERE external_submission."formId" IS NOT NULL
      AND (
        external_submission."organizationId" IS DISTINCT FROM form_record."organizationId"
        OR external_submission."locationId" IS DISTINCT FROM form_record."locationId"
      )
  ) THEN
    RAISE EXCEPTION 'External form submissions contain cross-scope form references';
  END IF;
END;
$$;
--> statement-breakpoint
WITH candidate_matches AS (
  SELECT external_submission."id" AS "externalId", min(mirror."id") AS "mirrorId"
  FROM "ExternalFormSubmission" external_submission
  JOIN "FormSubmission" mirror
    ON mirror."formId" = external_submission."formId"
    AND mirror."submittedAt" = external_submission."submittedAt"
    AND mirror."data" = external_submission."data"
    AND mirror."receiptId" IS NULL
  JOIN "Form" form_record
    ON form_record."id" = external_submission."formId"
    AND form_record."organizationId" = external_submission."organizationId"
    AND form_record."locationId" IS NOT DISTINCT FROM external_submission."locationId"
  WHERE external_submission."formId" IS NOT NULL
  GROUP BY external_submission."id"
  HAVING count(*) = 1
), unique_matches AS (
  SELECT "externalId", "mirrorId"
  FROM candidate_matches
  WHERE "mirrorId" IN (
    SELECT "mirrorId"
    FROM candidate_matches
    GROUP BY "mirrorId"
    HAVING count(*) = 1
  )
)
UPDATE "ExternalFormSubmission" external_submission
SET "mirroredFormSubmissionId" = unique_matches."mirrorId"
FROM unique_matches
WHERE external_submission."id" = unique_matches."externalId";
--> statement-breakpoint
UPDATE "FormSubmission" mirror
SET
  "organizationId" = external_submission."organizationId",
  "locationId" = external_submission."locationId"
FROM "ExternalFormSubmission" external_submission
WHERE external_submission."mirroredFormSubmissionId" = mirror."id";
--> statement-breakpoint
CREATE INDEX "FormSubmission_scope_submittedAt_idx" ON "FormSubmission" USING btree ("organizationId", "locationId", "submittedAt");
--> statement-breakpoint
CREATE INDEX "FormSubmission_retentionExpiresAt_idx" ON "FormSubmission" USING btree ("retentionExpiresAt") WHERE "receiptId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "FormSubmission_receiptId_key" ON "FormSubmission" USING btree ("receiptId") WHERE "receiptId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ExternalFormSubmission_mirroredFormSubmissionId_key" ON "ExternalFormSubmission" USING btree ("mirroredFormSubmissionId");
--> statement-breakpoint
CREATE UNIQUE INDEX "ExternalFormSubmission_funnelId_idempotencyKey_key" ON "ExternalFormSubmission" USING btree ("funnelId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD CONSTRAINT "ExternalFormSubmission_idempotency_hash_check" CHECK ("idempotencyKey" IS NULL OR char_length("payloadHash") = 64);
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_native_publication_scope_check" CHECK ("receiptId" IS NULL OR ("organizationId" IS NOT NULL AND "publicationTargetId" IS NOT NULL AND "publicationVersionId" IS NOT NULL AND "consentSnapshot" IS NOT NULL AND "retentionExpiresAt" IS NOT NULL AND "retentionExpiresAt" > "submittedAt"));
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "public"."Form"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_publicationTargetId_fkey" FOREIGN KEY ("organizationId", "publicationTargetId") REFERENCES "public"."PublicationTarget"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_publicationVersionId_fkey" FOREIGN KEY ("publicationTargetId", "publicationVersionId") REFERENCES "public"."PublicationVersion"("targetId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_receiptId_fkey" FOREIGN KEY ("organizationId", "receiptId") REFERENCES "public"."PublicFormSubmissionReceipt"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD CONSTRAINT "ExternalFormSubmission_mirroredFormSubmissionId_fkey" FOREIGN KEY ("mirroredFormSubmissionId") REFERENCES "public"."FormSubmission"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_public_form_receipt_scope"() RETURNS trigger AS $$
DECLARE
  target_record "PublicationTarget"%ROWTYPE;
  form_record "Form"%ROWTYPE;
  workflow_record "Workflows"%ROWTYPE;
BEGIN
  SELECT * INTO target_record FROM "PublicationTarget" WHERE "id" = NEW."targetId";
  IF NOT FOUND
    OR target_record."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR target_record."locationId" IS DISTINCT FROM NEW."locationId"
    OR target_record."kind" <> 'FORM'
    OR target_record."sourceId" IS DISTINCT FROM NEW."formId"
    OR target_record."status" <> 'PUBLISHED'
    OR target_record."publishedVersionId" IS DISTINCT FROM NEW."versionId" THEN
    RAISE EXCEPTION 'Public form receipt target scope mismatch';
  END IF;

  SELECT * INTO form_record FROM "Form" WHERE "id" = NEW."formId";
  IF NOT FOUND
    OR form_record."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR form_record."locationId" IS DISTINCT FROM NEW."locationId" THEN
    RAISE EXCEPTION 'Public form receipt form scope mismatch';
  END IF;

  IF NEW."workflowId" IS NOT NULL THEN
    SELECT * INTO workflow_record FROM "Workflows" WHERE "id" = NEW."workflowId";
    IF NOT FOUND
      OR workflow_record."organizationId" IS DISTINCT FROM NEW."organizationId"
      OR workflow_record."locationId" IS DISTINCT FROM NEW."locationId"
      OR workflow_record."archived"
      OR workflow_record."isTemplate" THEN
      RAISE EXCEPTION 'Public form receipt workflow scope mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "PublicFormSubmissionReceipt_scope_guard" BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "targetId", "versionId", "formId", "workflowId" ON "PublicFormSubmissionReceipt" FOR EACH ROW EXECUTE FUNCTION "assert_public_form_receipt_scope"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_native_form_submission_scope"() RETURNS trigger AS $$
DECLARE
  receipt_record "PublicFormSubmissionReceipt"%ROWTYPE;
BEGIN
  IF NEW."receiptId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO receipt_record FROM "PublicFormSubmissionReceipt" WHERE "id" = NEW."receiptId";
  IF NOT FOUND
    OR receipt_record."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR receipt_record."locationId" IS DISTINCT FROM NEW."locationId"
    OR receipt_record."targetId" IS DISTINCT FROM NEW."publicationTargetId"
    OR receipt_record."versionId" IS DISTINCT FROM NEW."publicationVersionId"
    OR receipt_record."formId" IS DISTINCT FROM NEW."formId"
    OR receipt_record."consentSnapshot" IS DISTINCT FROM NEW."consentSnapshot" THEN
    RAISE EXCEPTION 'Native form submission receipt scope mismatch';
  END IF;
  IF NEW."ipAddress" IS NOT NULL OR NEW."userAgent" IS NOT NULL OR NEW."referrer" IS NOT NULL THEN
    RAISE EXCEPTION 'Native form submissions may not persist request identifiers';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "FormSubmission_native_scope_guard" BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "formId", "publicationTargetId", "publicationVersionId", "receiptId", "consentSnapshot", "ipAddress", "userAgent", "referrer", "retentionExpiresAt", "submittedAt" ON "FormSubmission" FOR EACH ROW EXECUTE FUNCTION "assert_native_form_submission_scope"();
