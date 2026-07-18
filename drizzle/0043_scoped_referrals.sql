ALTER TABLE "ReferralProgram" ADD COLUMN "locationId" text;
--> statement-breakpoint
ALTER TABLE "Referral" ADD COLUMN "organizationId" text;
--> statement-breakpoint
ALTER TABLE "Referral" ADD COLUMN "locationId" text;
--> statement-breakpoint

LOCK TABLE "ReferralProgram", "Referral", "Client", "Location"
  IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Referral" referral
    INNER JOIN "ReferralProgram" program ON program."id" = referral."programId"
    INNER JOIN "Client" referrer ON referrer."id" = referral."referrerClientId"
    LEFT JOIN "Client" referee ON referee."id" = referral."refereeClientId"
    LEFT JOIN "Location" referrer_location ON referrer_location."id" = referrer."locationId"
    WHERE program."organizationId" <> referrer."organizationId"
      OR (
        referrer."locationId" IS NOT NULL
        AND referrer_location."organizationId" IS DISTINCT FROM referrer."organizationId"
      )
      OR (
        referee."id" IS NOT NULL
        AND (
          referee."organizationId" <> referrer."organizationId"
          OR referee."locationId" IS DISTINCT FROM referrer."locationId"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Cannot scope referrals: existing program, referrer, or referee ownership is inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReferralProgram" program
    INNER JOIN "Location" location
      ON location."organizationId" = program."organizationId"
    INNER JOIN "ReferralProgram" collision
      ON collision."id" = md5('aurea:referral-program:' || program."id" || ':' || location."id")
  ) THEN
    RAISE EXCEPTION 'Cannot scope referrals: deterministic cloned program ID collides with an existing program';
  END IF;
END $$;
--> statement-breakpoint

INSERT INTO "ReferralProgram" (
  "id",
  "organizationId",
  "locationId",
  "name",
  "isActive",
  "referrerRewardType",
  "referrerRewardValue",
  "refereeRewardType",
  "refereeRewardValue",
  "refereeOfferDays",
  "currency",
  "maxReferralsPerMember",
  "createdAt",
  "updatedAt"
)
SELECT
  md5('aurea:referral-program:' || program."id" || ':' || location."id"),
  program."organizationId",
  location."id",
  program."name",
  program."isActive",
  program."referrerRewardType",
  program."referrerRewardValue",
  program."refereeRewardType",
  program."refereeRewardValue",
  program."refereeOfferDays",
  program."currency",
  program."maxReferralsPerMember",
  program."createdAt",
  program."updatedAt"
FROM "ReferralProgram" program
INNER JOIN "Location" location
  ON location."organizationId" = program."organizationId";
--> statement-breakpoint

UPDATE "Referral" referral
SET
  "organizationId" = program."organizationId",
  "locationId" = referrer."locationId",
  "programId" = CASE
    WHEN referrer."locationId" IS NULL THEN program."id"
    ELSE md5('aurea:referral-program:' || program."id" || ':' || referrer."locationId")
  END
FROM "ReferralProgram" program
INNER JOIN "Client" referrer
  ON referrer."organizationId" = program."organizationId"
WHERE referral."programId" = program."id"
  AND referral."referrerClientId" = referrer."id"
  AND program."locationId" IS NULL;
--> statement-breakpoint

ALTER TABLE "Referral" ALTER COLUMN "organizationId" SET NOT NULL;
--> statement-breakpoint

DROP INDEX "ReferralProgram_organizationId_key";
--> statement-breakpoint
ALTER TABLE "ReferralProgram"
  ADD CONSTRAINT "ReferralProgram_organizationId_locationId_key"
  UNIQUE NULLS NOT DISTINCT ("organizationId", "locationId");
--> statement-breakpoint
CREATE UNIQUE INDEX "ReferralProgram_organizationId_id_key"
  ON "ReferralProgram" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "Client_organizationId_id_key"
  ON "Client" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE INDEX "Referral_organizationId_locationId_status_idx"
  ON "Referral" USING btree ("organizationId", "locationId", "status", "createdAt");
--> statement-breakpoint
CREATE INDEX "Referral_organizationId_locationId_program_referrer_idx"
  ON "Referral" USING btree ("organizationId", "locationId", "programId", "referrerClientId");
--> statement-breakpoint
CREATE INDEX "Referral_organizationId_locationId_refereeEmail_idx"
  ON "Referral" USING btree ("organizationId", "locationId", "refereeEmail");
--> statement-breakpoint

ALTER TABLE "ReferralProgram"
  ADD CONSTRAINT "ReferralProgram_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "Location" ("organizationId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_programId_fkey";
--> statement-breakpoint
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referrerClientId_fkey";
--> statement-breakpoint
ALTER TABLE "Referral"
  ADD CONSTRAINT "Referral_organizationId_programId_fkey"
  FOREIGN KEY ("organizationId", "programId")
  REFERENCES "ReferralProgram" ("organizationId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "Referral"
  ADD CONSTRAINT "Referral_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "Location" ("organizationId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "Referral"
  ADD CONSTRAINT "Referral_organizationId_referrerClientId_fkey"
  FOREIGN KEY ("organizationId", "referrerClientId")
  REFERENCES "Client" ("organizationId", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION validate_referral_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "ReferralProgram" program
    WHERE program."id" = NEW."programId"
      AND program."organizationId" = NEW."organizationId"
      AND program."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Referral scope does not match its program';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "Client" referrer
    WHERE referrer."id" = NEW."referrerClientId"
      AND referrer."organizationId" = NEW."organizationId"
      AND referrer."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Referral scope does not match its referrer';
  END IF;

  IF NEW."refereeClientId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "Client" referee
    WHERE referee."id" = NEW."refereeClientId"
      AND referee."organizationId" = NEW."organizationId"
      AND referee."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Referral scope does not match its referee';
  END IF;

  RETURN NEW;
END $$;
--> statement-breakpoint

CREATE TRIGGER "Referral_scope_guard"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "programId", "referrerClientId", "refereeClientId"
ON "Referral"
FOR EACH ROW
EXECUTE FUNCTION validate_referral_scope();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_referral_owner_scope_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'ReferralProgram' AND EXISTS (
    SELECT 1
    FROM "Referral" referral
    WHERE referral."programId" = OLD."id"
      AND (
        referral."organizationId" IS DISTINCT FROM NEW."organizationId"
        OR referral."locationId" IS DISTINCT FROM NEW."locationId"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot change the scope of a referral program with referrals';
  END IF;

  IF TG_TABLE_NAME = 'Client' AND EXISTS (
    SELECT 1
    FROM "Referral" referral
    WHERE (
        referral."referrerClientId" = OLD."id"
        OR referral."refereeClientId" = OLD."id"
      )
      AND (
        referral."organizationId" IS DISTINCT FROM NEW."organizationId"
        OR referral."locationId" IS DISTINCT FROM NEW."locationId"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot change the scope of a client referenced by referrals';
  END IF;

  RETURN NEW;
END $$;
--> statement-breakpoint

CREATE TRIGGER "ReferralProgram_scope_change_guard"
BEFORE UPDATE OF "organizationId", "locationId"
ON "ReferralProgram"
FOR EACH ROW
WHEN (
  OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
  OR OLD."locationId" IS DISTINCT FROM NEW."locationId"
)
EXECUTE FUNCTION prevent_referral_owner_scope_change();
--> statement-breakpoint

CREATE TRIGGER "Client_referral_scope_change_guard"
BEFORE UPDATE OF "organizationId", "locationId"
ON "Client"
FOR EACH ROW
WHEN (
  OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
  OR OLD."locationId" IS DISTINCT FROM NEW."locationId"
)
EXECUTE FUNCTION prevent_referral_owner_scope_change();
