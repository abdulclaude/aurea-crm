ALTER TABLE "Execution" ADD COLUMN "organizationId" text;

UPDATE "Execution" AS execution
SET "organizationId" = workflow."organizationId"
FROM "Workflows" AS workflow
WHERE workflow."id" = execution."workflowId";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Execution"
    WHERE "organizationId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot scope executions: one or more workflow records have no organization';
  END IF;
END $$;

ALTER TABLE "Execution" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "Execution_organizationId_idx"
ON "Execution" USING btree ("organizationId");

ALTER TABLE "Execution"
ADD CONSTRAINT "Execution_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "Execution"
ADD CONSTRAINT "Execution_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON UPDATE cascade;

ALTER TABLE "Workflows"
ADD CONSTRAINT "Workflows_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON UPDATE cascade;
