ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "crmResolutionConfig" jsonb DEFAULT '{"enabled":false}'::jsonb NOT NULL;
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "crmResolutionConfig" jsonb;
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "clientResolutionStatus" text DEFAULT 'NOT_CONFIGURED' NOT NULL;
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "clientResolutionAttempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "clientResolutionError" text;
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "lastClientResolutionAttemptAt" timestamp(3);
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "clientResolvedAt" timestamp(3);

CREATE INDEX IF NOT EXISTS "FormSubmission_clientResolutionStatus_idx" ON "FormSubmission" USING btree ("clientResolutionStatus");

DO $$ BEGIN
 ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_clientResolutionStatus_check" CHECK ("clientResolutionStatus" IN ('NOT_CONFIGURED', 'PENDING', 'RESOLVING', 'RESOLVED', 'REVIEW', 'FAILED'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_clientResolutionAttempts_check" CHECK ("clientResolutionAttempts" BETWEEN 0 AND 10);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
