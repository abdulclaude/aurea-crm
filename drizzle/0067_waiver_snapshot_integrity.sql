ALTER TABLE "WaiverSignature" ALTER COLUMN "templateVersion" DROP NOT NULL;
ALTER TABLE "WaiverSignature" ALTER COLUMN "templateVersion" DROP DEFAULT;
ALTER TABLE "WaiverSignature" ADD COLUMN "templateName" text;
ALTER TABLE "WaiverSignature" ADD COLUMN "templateContent" text;
UPDATE "WaiverSignature"
SET "templateVersion" = NULL,
    "documentUrl" = NULL,
    "documentName" = NULL,
    "documentKey" = NULL
WHERE "templateName" IS NULL;
CREATE UNIQUE INDEX "WaiverSignature_template_client_version_key"
  ON "WaiverSignature" ("templateId", "clientId", "templateVersion");

CREATE OR REPLACE FUNCTION enforce_workflow_folder_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."folderId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "WorkflowFolder" AS folder
    WHERE folder."id" = NEW."folderId"
      AND folder."organizationId" = NEW."organizationId"
      AND folder."userId" = NEW."userId"
      AND folder."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Workflow folder must belong to the exact workflow scope';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Workflows_folder_scope_guard"
BEFORE INSERT OR UPDATE OF "folderId", "organizationId", "locationId", "userId"
ON "Workflows"
FOR EACH ROW
EXECUTE FUNCTION enforce_workflow_folder_scope();
