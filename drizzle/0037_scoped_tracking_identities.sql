DO $$
BEGIN
  IF EXISTS (
    WITH profile_scopes AS (
      SELECT p."id" AS profile_id, f."organizationId", f."locationId"
      FROM "anonymous_user_profiles" p
      JOIN "FunnelSession" s
        ON s."profileId" = p."id" OR s."anonymousId" = p."id"
      JOIN "Funnel" f ON f."id" = s."funnelId"
      UNION
      SELECT p."id" AS profile_id, f."organizationId", f."locationId"
      FROM "anonymous_user_profiles" p
      JOIN "FunnelEvent" e ON e."anonymousId" = p."id"
      JOIN "Funnel" f ON f."id" = e."funnelId"
    )
    SELECT 1
    FROM "anonymous_user_profiles" p
    LEFT JOIN profile_scopes s ON s.profile_id = p."id"
    GROUP BY p."id"
    HAVING count(DISTINCT (s."organizationId", s."locationId")) <> 1
  ) THEN
    RAISE EXCEPTION 'Anonymous profiles must resolve to exactly one organization/location scope before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FunnelSession" session
    JOIN "Funnel" funnel ON funnel."id" = session."funnelId"
    WHERE session."locationId" IS DISTINCT FROM funnel."locationId"
  ) OR EXISTS (
    SELECT 1
    FROM "FunnelEvent" event
    JOIN "Funnel" funnel ON funnel."id" = event."funnelId"
    WHERE event."locationId" IS DISTINCT FROM funnel."locationId"
  ) THEN
    RAISE EXCEPTION 'Historical tracking location scope conflicts with canonical funnel scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FunnelSession"
    GROUP BY "funnelId", "sessionId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate funnel session identities must be reconciled before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FunnelSession" session
    WHERE session."profileId" IS NOT NULL
      AND session."anonymousId" IS DISTINCT FROM session."profileId"
  ) THEN
    RAISE EXCEPTION 'Historical funnel session profile identities must be reconciled before migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FunnelWebVital" vital
    LEFT JOIN "FunnelSession" session
      ON session."funnelId" = vital."funnelId"
     AND session."sessionId" = vital."sessionId"
    WHERE session."id" IS NULL
       OR vital."anonymousId" IS DISTINCT FROM session."anonymousId"
  ) THEN
    RAISE EXCEPTION 'Web vital session scope must be reconciled before migration';
  END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ADD COLUMN "organizationId" text;
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ADD COLUMN "locationId" text;
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ADD COLUMN "anonymousId" text;
--> statement-breakpoint
WITH profile_scopes AS (
  SELECT p."id" AS profile_id, f."organizationId", f."locationId"
  FROM "anonymous_user_profiles" p
  JOIN "FunnelSession" s
    ON s."profileId" = p."id" OR s."anonymousId" = p."id"
  JOIN "Funnel" f ON f."id" = s."funnelId"
  UNION
  SELECT p."id" AS profile_id, f."organizationId", f."locationId"
  FROM "anonymous_user_profiles" p
  JOIN "FunnelEvent" e ON e."anonymousId" = p."id"
  JOIN "Funnel" f ON f."id" = e."funnelId"
), resolved_scopes AS (
  SELECT profile_id, min("organizationId") AS "organizationId", min("locationId") AS "locationId"
  FROM profile_scopes
  GROUP BY profile_id
)
UPDATE "anonymous_user_profiles" profile
SET
  "organizationId" = scope."organizationId",
  "locationId" = scope."locationId",
  "anonymousId" = profile."id"
FROM resolved_scopes scope
WHERE scope.profile_id = profile."id";
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ALTER COLUMN "organizationId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ALTER COLUMN "anonymousId" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "anonymous_user_profiles_org_identity_key" ON "anonymous_user_profiles" USING btree ("organizationId", "anonymousId") WHERE "locationId" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "anonymous_user_profiles_location_identity_key" ON "anonymous_user_profiles" USING btree ("organizationId", "locationId", "anonymousId") WHERE "locationId" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "anonymous_user_profiles_scope_lastSeen_idx" ON "anonymous_user_profiles" USING btree ("organizationId", "locationId", "lastSeen");
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ADD CONSTRAINT "anonymous_user_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "anonymous_user_profiles" ADD CONSTRAINT "anonymous_user_profiles_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FunnelWebVital" DROP CONSTRAINT IF EXISTS "FunnelWebVital_sessionId_fkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "FunnelSession_sessionId_key";
--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelSession_funnelId_sessionId_key" ON "FunnelSession" USING btree ("funnelId", "sessionId");
--> statement-breakpoint
CREATE INDEX "FunnelEvent_funnelId_sessionId_idx" ON "FunnelEvent" USING btree ("funnelId", "sessionId");
--> statement-breakpoint
ALTER TABLE "FunnelWebVital" ADD CONSTRAINT "FunnelWebVital_funnelId_sessionId_fkey" FOREIGN KEY ("funnelId", "sessionId") REFERENCES "public"."FunnelSession"("funnelId", "sessionId") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_funnel_session_scope"() RETURNS trigger AS $$
DECLARE
  funnel_record "Funnel"%ROWTYPE;
  profile_record "anonymous_user_profiles"%ROWTYPE;
BEGIN
  SELECT * INTO funnel_record FROM "Funnel" WHERE "id" = NEW."funnelId";
  IF NOT FOUND OR NEW."locationId" IS DISTINCT FROM funnel_record."locationId" THEN
    RAISE EXCEPTION 'Funnel session location scope mismatch';
  END IF;

  IF NEW."profileId" IS NOT NULL THEN
    SELECT * INTO profile_record
    FROM "anonymous_user_profiles"
    WHERE "id" = NEW."profileId";
    IF NOT FOUND
      OR profile_record."organizationId" IS DISTINCT FROM funnel_record."organizationId"
      OR profile_record."locationId" IS DISTINCT FROM funnel_record."locationId"
      OR profile_record."anonymousId" IS DISTINCT FROM NEW."anonymousId" THEN
      RAISE EXCEPTION 'Funnel session profile scope mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "FunnelSession_scope_guard" BEFORE INSERT OR UPDATE OF "funnelId", "locationId", "profileId" ON "FunnelSession" FOR EACH ROW EXECUTE FUNCTION "assert_funnel_session_scope"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assert_funnel_tracking_location_scope"() RETURNS trigger AS $$
DECLARE
  canonical_location_id text;
  canonical_anonymous_id text;
BEGIN
  SELECT "locationId" INTO canonical_location_id
  FROM "Funnel"
  WHERE "id" = NEW."funnelId";
  IF NOT FOUND OR NEW."locationId" IS DISTINCT FROM canonical_location_id THEN
    RAISE EXCEPTION 'Funnel tracking location scope mismatch';
  END IF;
  IF TG_TABLE_NAME = 'FunnelWebVital' THEN
    SELECT "anonymousId" INTO canonical_anonymous_id
    FROM "FunnelSession"
    WHERE "funnelId" = NEW."funnelId" AND "sessionId" = NEW."sessionId";
    IF NOT FOUND OR NEW."anonymousId" IS DISTINCT FROM canonical_anonymous_id THEN
      RAISE EXCEPTION 'Funnel web vital subject scope mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "FunnelEvent_scope_guard" BEFORE INSERT OR UPDATE OF "funnelId", "locationId" ON "FunnelEvent" FOR EACH ROW EXECUTE FUNCTION "assert_funnel_tracking_location_scope"();
--> statement-breakpoint
CREATE TRIGGER "FunnelWebVital_scope_guard" BEFORE INSERT OR UPDATE OF "funnelId", "locationId" ON "FunnelWebVital" FOR EACH ROW EXECUTE FUNCTION "assert_funnel_tracking_location_scope"();
--> statement-breakpoint
CREATE UNIQUE INDEX "Funnel_organizationId_id_key" ON "Funnel" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE TABLE "FunnelRequestQuota" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "funnelId" text NOT NULL,
  "action" text NOT NULL,
  "dimension" text NOT NULL,
  "subjectKeyHash" text NOT NULL,
  "windowStartedAt" timestamp(3) NOT NULL,
  "windowSeconds" integer NOT NULL,
  "requestCount" integer DEFAULT 1 NOT NULL,
  "expiresAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "FunnelRequestQuota_values_check" CHECK (char_length("action") BETWEEN 1 AND 100 AND "dimension" IN ('SUBJECT', 'GLOBAL') AND char_length("subjectKeyHash") = 64 AND "windowSeconds" BETWEEN 1 AND 86400 AND "requestCount" > 0)
);
--> statement-breakpoint
ALTER TABLE "FunnelRequestQuota" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "FunnelRequestQuota_counter_key" ON "FunnelRequestQuota" USING btree ("funnelId", "action", "dimension", "subjectKeyHash", "windowStartedAt");
--> statement-breakpoint
CREATE INDEX "FunnelRequestQuota_expiresAt_idx" ON "FunnelRequestQuota" USING btree ("expiresAt");
--> statement-breakpoint
ALTER TABLE "FunnelRequestQuota" ADD CONSTRAINT "FunnelRequestQuota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "FunnelRequestQuota" ADD CONSTRAINT "FunnelRequestQuota_funnelId_fkey" FOREIGN KEY ("organizationId", "funnelId") REFERENCES "public"."Funnel"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
