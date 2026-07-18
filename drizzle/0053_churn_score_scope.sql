ALTER TABLE "ChurnRiskScore" ADD COLUMN "locationId" text;
--> statement-breakpoint
UPDATE "ChurnRiskScore" score
SET "locationId" = member."locationId"
FROM "Client" member
WHERE member.id = score."clientId"
  AND member."organizationId" = score."organizationId";
--> statement-breakpoint
DO $$
DECLARE
  invalid_scores integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO invalid_scores
  FROM "ChurnRiskScore" score
  LEFT JOIN "Client" member
    ON member.id = score."clientId"
    AND member."organizationId" = score."organizationId"
  WHERE member.id IS NULL
    OR score."locationId" IS DISTINCT FROM member."locationId";

  IF invalid_scores > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format(
        'Churn score scope migration blocked: %s rows do not match an exact organization/location member.',
        invalid_scores
      );
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX "ChurnRiskScore_organizationId_locationId_riskLevel_idx"
  ON "ChurnRiskScore" USING btree ("organizationId", "locationId", "riskLevel");
--> statement-breakpoint
ALTER TABLE "ChurnRiskScore"
  ADD CONSTRAINT "ChurnRiskScore_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "public"."Location"("organizationId", "id")
  ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ChurnRiskScore"
  ADD CONSTRAINT "ChurnRiskScore_organizationId_clientId_fkey"
  FOREIGN KEY ("organizationId", "clientId")
  REFERENCES "public"."Client"("organizationId", "id")
  ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_churn_score_exact_scope()
RETURNS trigger AS $$
DECLARE
  member_organization_id text;
  member_location_id text;
BEGIN
  SELECT "organizationId", "locationId"
  INTO member_organization_id, member_location_id
  FROM "Client"
  WHERE id = NEW."clientId";

  IF NEW."organizationId" IS DISTINCT FROM member_organization_id
    OR NEW."locationId" IS DISTINCT FROM member_location_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Churn score member, organization, and location scope must match.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "ChurnRiskScore_exact_scope_guard"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "clientId"
ON "ChurnRiskScore"
FOR EACH ROW EXECUTE FUNCTION enforce_churn_score_exact_scope();
