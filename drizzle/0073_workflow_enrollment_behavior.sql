ALTER TABLE "Workflows"
ADD COLUMN IF NOT EXISTS "behaviorConfig" jsonb DEFAULT '{"enrollment":"EVERY_EVENT"}'::jsonb NOT NULL;

CREATE TABLE IF NOT EXISTS "WorkflowEnrollment" (
  "id" text PRIMARY KEY NOT NULL,
  "workflowId" text NOT NULL,
  "executionId" text NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "clientId" text NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowEnrollment_workflowId_clientId_key"
ON "WorkflowEnrollment" ("workflowId", "clientId");

CREATE INDEX IF NOT EXISTS "WorkflowEnrollment_scope_createdAt_idx"
ON "WorkflowEnrollment" ("organizationId", "locationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "WorkflowEnrollment"
  ADD CONSTRAINT "WorkflowEnrollment_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkflowEnrollment"
  ADD CONSTRAINT "WorkflowEnrollment_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "public"."Execution"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkflowEnrollment"
  ADD CONSTRAINT "WorkflowEnrollment_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkflowEnrollment"
  ADD CONSTRAINT "WorkflowEnrollment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkflowEnrollment"
  ADD CONSTRAINT "WorkflowEnrollment_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "WorkflowEnrollment" ENABLE ROW LEVEL SECURITY;
