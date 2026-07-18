DO $$
DECLARE
  duplicate_groups integer;
  scope_mismatches integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO duplicate_groups
  FROM (
    SELECT 1
    FROM "CheckIn"
    GROUP BY "classId", "clientId"
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = format(
        'Check-in integrity migration blocked: %s class/member duplicate groups require reconciliation.',
        duplicate_groups
      );
  END IF;

  SELECT COUNT(*)::integer
  INTO scope_mismatches
  FROM "CheckIn" check_in
  INNER JOIN "StudioClass" studio_class ON studio_class.id = check_in."classId"
  INNER JOIN "Client" member ON member.id = check_in."clientId"
  WHERE
    check_in."organizationId" IS DISTINCT FROM studio_class."organizationId"
    OR check_in."organizationId" IS DISTINCT FROM member."organizationId"
    OR check_in."locationId" IS DISTINCT FROM studio_class."locationId"
    OR check_in."locationId" IS DISTINCT FROM member."locationId";

  IF scope_mismatches > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format(
        'Check-in integrity migration blocked: %s rows have mismatched tenant scope.',
        scope_mismatches
      );
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "StudioClass_organizationId_id_key"
  ON "StudioClass" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "CheckIn_classId_clientId_key"
  ON "CheckIn" USING btree ("classId", "clientId");
--> statement-breakpoint
ALTER TABLE "CheckIn"
  ADD CONSTRAINT "CheckIn_organizationId_classId_fkey"
  FOREIGN KEY ("organizationId", "classId")
  REFERENCES "public"."StudioClass"("organizationId", "id")
  ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CheckIn"
  ADD CONSTRAINT "CheckIn_organizationId_clientId_fkey"
  FOREIGN KEY ("organizationId", "clientId")
  REFERENCES "public"."Client"("organizationId", "id")
  ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_checkin_exact_scope()
RETURNS trigger AS $$
DECLARE
  class_organization_id text;
  class_location_id text;
  member_organization_id text;
  member_location_id text;
BEGIN
  SELECT "organizationId", "locationId"
  INTO class_organization_id, class_location_id
  FROM "StudioClass"
  WHERE id = NEW."classId";

  SELECT "organizationId", "locationId"
  INTO member_organization_id, member_location_id
  FROM "Client"
  WHERE id = NEW."clientId";

  IF NEW."organizationId" IS DISTINCT FROM class_organization_id
    OR NEW."locationId" IS DISTINCT FROM class_location_id
    OR NEW."organizationId" IS DISTINCT FROM member_organization_id
    OR NEW."locationId" IS DISTINCT FROM member_location_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Check-in class, member, organization, and location scope must match.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "CheckIn_exact_scope_guard"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "classId", "clientId"
ON "CheckIn"
FOR EACH ROW EXECUTE FUNCTION enforce_checkin_exact_scope();
