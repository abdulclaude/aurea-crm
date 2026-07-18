CREATE TYPE "WorkspaceWeekStart" AS ENUM ('SUNDAY', 'MONDAY', 'SATURDAY');
CREATE TYPE "WorkspaceDateFormat" AS ENUM ('LOCALE', 'MONTH_DAY_YEAR', 'DAY_MONTH_YEAR', 'YEAR_MONTH_DAY');
CREATE TYPE "WorkspaceTimeFormat" AS ENUM ('TWELVE_HOUR', 'TWENTY_FOUR_HOUR');

CREATE TABLE "WorkspaceRegionalSettingsVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "version" integer NOT NULL,
  "timezone" text,
  "locale" text,
  "currency" text,
  "weekStart" "WorkspaceWeekStart",
  "dateFormat" "WorkspaceDateFormat",
  "timeFormat" "WorkspaceTimeFormat",
  "isActive" boolean DEFAULT false NOT NULL,
  "isRollback" boolean DEFAULT false NOT NULL,
  "rollbackFromVersion" integer,
  "changeNote" text,
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "WorkspaceRegionalSettingsVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "WorkspaceRegionalSettingsVersion_org_values_check" CHECK (
    "locationId" IS NOT NULL OR (
      "timezone" IS NOT NULL AND "locale" IS NOT NULL AND "currency" IS NOT NULL
      AND "weekStart" IS NOT NULL AND "dateFormat" IS NOT NULL AND "timeFormat" IS NOT NULL
    )
  ),
  CONSTRAINT "WorkspaceRegionalSettingsVersion_text_values_check" CHECK (
    ("timezone" IS NULL OR length("timezone") BETWEEN 1 AND 100)
    AND ("locale" IS NULL OR length("locale") BETWEEN 2 AND 35)
    AND ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$')
  ),
  CONSTRAINT "WorkspaceRegionalSettingsVersion_rollback_check" CHECK (
    ("isRollback" = false AND "rollbackFromVersion" IS NULL)
    OR ("isRollback" = true AND "rollbackFromVersion" IS NOT NULL AND "rollbackFromVersion" > 0)
  )
);

CREATE UNIQUE INDEX "WorkspaceRegionalSettingsVersion_location_version_key"
  ON "WorkspaceRegionalSettingsVersion" USING btree ("organizationId", "locationId", "version")
  WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "WorkspaceRegionalSettingsVersion_org_version_key"
  ON "WorkspaceRegionalSettingsVersion" USING btree ("organizationId", "version")
  WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "WorkspaceRegionalSettingsVersion_active_location_key"
  ON "WorkspaceRegionalSettingsVersion" USING btree ("organizationId", "locationId")
  WHERE "isActive" = true AND "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "WorkspaceRegionalSettingsVersion_active_org_key"
  ON "WorkspaceRegionalSettingsVersion" USING btree ("organizationId")
  WHERE "isActive" = true AND "locationId" IS NULL;
CREATE INDEX "WorkspaceRegionalSettingsVersion_scope_createdAt_idx"
  ON "WorkspaceRegionalSettingsVersion" USING btree ("organizationId", "locationId", "createdAt");

ALTER TABLE "WorkspaceRegionalSettingsVersion"
  ADD CONSTRAINT "WorkspaceRegionalSettingsVersion_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "WorkspaceRegionalSettingsVersion_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "WorkspaceRegionalSettingsVersion_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

CREATE FUNCTION is_supported_regional_currency(value text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(COALESCE(value, '')) = ANY(ARRAY[
    'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BZD','CAD','CDF','CHF','CLP','CNY','COP','CRC','CUC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HRK','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD','KZT','LAK','LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN','PGK','PHP','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLE','SLL','SOS','SRD','SSP','STN','SVC','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX','USD','UYU','UZS','VES','VND','VUV','WST','XAF','XCD','XCG','XDR','XOF','XPF','XSU','YER','ZAR','ZMW','ZWG','ZWL'
  ]::text[])
$$;

INSERT INTO "WorkspaceRegionalSettingsVersion" (
  "id", "organizationId", "version", "timezone", "locale", "currency",
  "weekStart", "dateFormat", "timeFormat", "isActive", "changeNote"
)
SELECT
  'regional-org-' || md5("id"), "id", 1, 'UTC', 'en-US',
  CASE WHEN is_supported_regional_currency("currency") THEN upper("currency") ELSE 'USD' END,
  'MONDAY', 'LOCALE', 'TWELVE_HOUR', true, 'Migrated organization defaults'
FROM "Organization";

INSERT INTO "WorkspaceRegionalSettingsVersion" (
  "id", "organizationId", "locationId", "version", "timezone", "isActive", "changeNote"
)
SELECT
  'regional-location-' || md5("id"), "organizationId", "id", 1, "timezone", true,
  'Migrated location timezone override'
FROM "Location"
WHERE "timezone" IS NOT NULL
  AND "timezone" <> 'UTC'
  AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = "Location"."timezone");

CREATE FUNCTION create_organization_regional_settings() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "WorkspaceRegionalSettingsVersion" (
    "id", "organizationId", "version", "timezone", "locale", "currency",
    "weekStart", "dateFormat", "timeFormat", "isActive", "changeNote"
  ) VALUES (
    'regional-org-' || md5(NEW."id"), NEW."id", 1, 'UTC', 'en-US',
    CASE WHEN is_supported_regional_currency(NEW."currency") THEN upper(NEW."currency") ELSE 'USD' END,
    'MONDAY', 'LOCALE', 'TWELVE_HOUR', true, 'Created with organization'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Organization_create_regional_settings"
AFTER INSERT ON "Organization"
FOR EACH ROW EXECUTE FUNCTION create_organization_regional_settings();

ALTER TABLE "Location" ALTER COLUMN "timezone" DROP DEFAULT;

CREATE FUNCTION inherit_location_regional_timezone() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  organization_timezone text;
BEGIN
  IF NEW."timezone" IS NULL THEN
    SELECT "timezone" INTO organization_timezone
    FROM "WorkspaceRegionalSettingsVersion"
    WHERE "organizationId" = NEW."organizationId"
      AND "locationId" IS NULL
      AND "isActive" = true;
    NEW."timezone" := COALESCE(organization_timezone, 'UTC');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Location_inherit_regional_timezone"
BEFORE INSERT ON "Location"
FOR EACH ROW EXECUTE FUNCTION inherit_location_regional_timezone();

CREATE FUNCTION create_location_regional_settings_override() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  organization_timezone text;
BEGIN
  SELECT "timezone" INTO organization_timezone
  FROM "WorkspaceRegionalSettingsVersion"
  WHERE "organizationId" = NEW."organizationId"
    AND "locationId" IS NULL
    AND "isActive" = true;

  IF NEW."timezone" IS NOT NULL
    AND NEW."timezone" IS DISTINCT FROM organization_timezone
    AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW."timezone") THEN
    INSERT INTO "WorkspaceRegionalSettingsVersion" (
      "id", "organizationId", "locationId", "version", "timezone", "isActive", "changeNote"
    ) VALUES (
      'regional-location-' || md5(NEW."id"), NEW."organizationId", NEW."id", 1,
      NEW."timezone", true, 'Created with location'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Location_create_regional_settings_override"
AFTER INSERT ON "Location"
FOR EACH ROW EXECUTE FUNCTION create_location_regional_settings_override();

CREATE FUNCTION protect_regional_settings_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM "Organization" WHERE "id" = OLD."organizationId"
    ) OR (
      OLD."locationId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Location"
        WHERE "organizationId" = OLD."organizationId"
          AND "id" = OLD."locationId"
      )
    ) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Workspace regional settings versions cannot be deleted';
  END IF;
  IF OLD."createdBy" IS NOT NULL
    AND NEW."createdBy" IS NULL
    AND (to_jsonb(NEW) - 'createdBy') = (to_jsonb(OLD) - 'createdBy') THEN
    RETURN NEW;
  END IF;
  IF OLD."isActive" = true
    AND NEW."isActive" = false
    AND (to_jsonb(NEW) - 'isActive') = (to_jsonb(OLD) - 'isActive') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Workspace regional settings versions are immutable';
END;
$$;

CREATE TRIGGER "WorkspaceRegionalSettingsVersion_protect_history"
BEFORE UPDATE OR DELETE ON "WorkspaceRegionalSettingsVersion"
FOR EACH ROW EXECUTE FUNCTION protect_regional_settings_history();

ALTER TABLE "WorkspaceRegionalSettingsVersion" ENABLE ROW LEVEL SECURITY;
