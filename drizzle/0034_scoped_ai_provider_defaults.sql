ALTER TABLE "Credential" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;
ALTER TABLE "Credential" ADD COLUMN "isDefault" boolean DEFAULT false NOT NULL;
ALTER TABLE "AILog" ADD COLUMN "credentialId" text;
ALTER TABLE "AILog" ADD COLUMN "model" text;
--> statement-breakpoint

WITH single_ai_credentials AS (
  SELECT min("id") AS "id"
  FROM "Credential"
  WHERE "type" IN ('GEMINI', 'OPENAI', 'ANTHROPIC')
    AND "isActive" = true
  GROUP BY "organizationId", "locationId", "type"
  HAVING count(*) = 1
)
UPDATE "Credential" AS credential
SET "isDefault" = true
FROM single_ai_credentials AS single
WHERE credential."id" = single."id";
--> statement-breakpoint

CREATE UNIQUE INDEX "Credential_organizationId_id_key"
  ON "Credential" USING btree ("organizationId", "id");
CREATE UNIQUE INDEX "Credential_scope_id_key"
  ON "Credential" USING btree ("organizationId", "locationId", "id");
CREATE UNIQUE INDEX "Credential_default_organization_type_key"
  ON "Credential" USING btree ("organizationId", "type")
  WHERE "isDefault" = true AND "isActive" = true AND "locationId" IS NULL;
CREATE UNIQUE INDEX "Credential_default_location_type_key"
  ON "Credential" USING btree ("organizationId", "locationId", "type")
  WHERE "isDefault" = true AND "isActive" = true AND "locationId" IS NOT NULL;
CREATE INDEX "AILog_credentialId_idx"
  ON "AILog" USING btree ("credentialId");
--> statement-breakpoint

ALTER TABLE "Credential"
  ADD CONSTRAINT "Credential_default_requires_active_check"
  CHECK (NOT "isDefault" OR "isActive");

ALTER TABLE "AILog"
  ADD CONSTRAINT "AILog_credential_organization_check"
  CHECK ("credentialId" IS NULL OR "organizationId" IS NOT NULL);
ALTER TABLE "AILog"
  ADD CONSTRAINT "AILog_credential_model_check"
  CHECK ("credentialId" IS NULL OR "model" IS NOT NULL);

ALTER TABLE "AILog"
  ADD CONSTRAINT "AILog_credential_scope_fkey"
  FOREIGN KEY ("organizationId", "credentialId")
  REFERENCES "Credential"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AILog"
  ADD CONSTRAINT "AILog_credential_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "credentialId")
  REFERENCES "Credential"("organizationId", "locationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_ai_log_credential_exact_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  bound_organization_id text;
  bound_location_id text;
  bound_type text;
BEGIN
  IF NEW."credentialId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT credential."organizationId", credential."locationId", credential."type"::text
  INTO bound_organization_id, bound_location_id, bound_type
  FROM "Credential" AS credential
  WHERE credential."id" = NEW."credentialId";

  IF NOT FOUND
    OR NEW."organizationId" IS DISTINCT FROM bound_organization_id
    OR NEW."locationId" IS DISTINCT FROM bound_location_id
    OR bound_type NOT IN ('GEMINI', 'OPENAI', 'ANTHROPIC')
  THEN
    RAISE EXCEPTION 'AI log credential must match the record account scope exactly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AILog_exact_credential_scope"
BEFORE INSERT OR UPDATE ON "AILog"
FOR EACH ROW
EXECUTE FUNCTION enforce_ai_log_credential_exact_scope();
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Node" AS node
    JOIN "Workflows" AS workflow ON workflow."id" = node."workflowId"
    JOIN "Credential" AS credential ON credential."id" = node."credentialId"
    WHERE node."credentialId" IS NOT NULL
      AND (
        workflow."organizationId" IS DISTINCT FROM credential."organizationId"
        OR workflow."locationId" IS DISTINCT FROM credential."locationId"
        OR (node."type" = 'GEMINI' AND credential."type" <> 'GEMINI')
        OR (
          node."type" IN ('TELEGRAM_TRIGGER', 'TELEGRAM_EXECUTION')
          AND credential."type" <> 'TELEGRAM_BOT'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Node credential scope preflight failed';
  END IF;
END
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_node_credential_exact_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  workflow_organization_id text;
  workflow_location_id text;
  credential_organization_id text;
  credential_location_id text;
  credential_type text;
BEGIN
  IF NEW."credentialId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workflow."organizationId", workflow."locationId"
  INTO workflow_organization_id, workflow_location_id
  FROM "Workflows" AS workflow
  WHERE workflow."id" = NEW."workflowId";

  SELECT credential."organizationId", credential."locationId", credential."type"::text
  INTO credential_organization_id, credential_location_id, credential_type
  FROM "Credential" AS credential
  WHERE credential."id" = NEW."credentialId";

  IF workflow_organization_id IS DISTINCT FROM credential_organization_id
    OR workflow_location_id IS DISTINCT FROM credential_location_id
    OR (NEW."type" = 'GEMINI' AND credential_type <> 'GEMINI')
    OR (
      NEW."type" IN ('TELEGRAM_TRIGGER', 'TELEGRAM_EXECUTION')
      AND credential_type <> 'TELEGRAM_BOT'
    )
  THEN
    RAISE EXCEPTION 'Node credential must match the workflow account scope exactly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Node_exact_credential_scope"
BEFORE INSERT OR UPDATE ON "Node"
FOR EACH ROW
EXECUTE FUNCTION enforce_node_credential_exact_scope();
