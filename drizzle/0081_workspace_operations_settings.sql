CREATE TABLE "WorkspaceOperationsSettingsVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "version" integer NOT NULL,
  "businessHours" jsonb,
  "scheduleStartMinutes" integer,
  "scheduleEndMinutes" integer,
  "scheduleSlotMinutes" integer,
  "guestBookingEnabled" boolean,
  "maxGuestsPerBooking" integer,
  "guestRequiredFields" text[],
  "showPublicEmail" boolean,
  "showPublicPhone" boolean,
  "showPublicWebsite" boolean,
  "showPublicAddress" boolean,
  "isActive" boolean DEFAULT false NOT NULL,
  "isRollback" boolean DEFAULT false NOT NULL,
  "rollbackFromVersion" integer,
  "changeNote" text,
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "WorkspaceOperationsSettingsVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "WorkspaceOperationsSettingsVersion_org_values_check" CHECK (
    "locationId" IS NOT NULL OR (
      "businessHours" IS NOT NULL
      AND "scheduleStartMinutes" IS NOT NULL
      AND "scheduleEndMinutes" IS NOT NULL
      AND "scheduleSlotMinutes" IS NOT NULL
      AND "guestBookingEnabled" IS NOT NULL
      AND "maxGuestsPerBooking" IS NOT NULL
      AND "guestRequiredFields" IS NOT NULL
      AND "showPublicEmail" IS NOT NULL
      AND "showPublicPhone" IS NOT NULL
      AND "showPublicWebsite" IS NOT NULL
      AND "showPublicAddress" IS NOT NULL
    )
  ),
  CONSTRAINT "WorkspaceOperationsSettingsVersion_schedule_check" CHECK (
    ("scheduleStartMinutes" IS NULL OR "scheduleStartMinutes" BETWEEN 0 AND 1439)
    AND ("scheduleEndMinutes" IS NULL OR "scheduleEndMinutes" BETWEEN 1 AND 1440)
    AND ("scheduleStartMinutes" IS NULL OR "scheduleEndMinutes" IS NULL OR "scheduleStartMinutes" < "scheduleEndMinutes")
    AND ("scheduleSlotMinutes" IS NULL OR "scheduleSlotMinutes" IN (5, 10, 15, 20, 30, 60))
  ),
  CONSTRAINT "WorkspaceOperationsSettingsVersion_guests_check" CHECK (
    "maxGuestsPerBooking" IS NULL OR "maxGuestsPerBooking" BETWEEN 0 AND 20
  ),
  CONSTRAINT "WorkspaceOperationsSettingsVersion_guest_fields_check" CHECK (
    "guestRequiredFields" IS NULL OR "guestRequiredFields" <@ ARRAY['EMAIL']::text[]
  ),
  CONSTRAINT "WorkspaceOperationsSettingsVersion_business_hours_check" CHECK (
    "businessHours" IS NULL OR jsonb_typeof("businessHours") = 'object'
  ),
  CONSTRAINT "WorkspaceOperationsSettingsVersion_rollback_check" CHECK (
    ("isRollback" = false AND "rollbackFromVersion" IS NULL)
    OR ("isRollback" = true AND "rollbackFromVersion" IS NOT NULL AND "rollbackFromVersion" > 0)
  ),
  CONSTRAINT "WorkspaceOperationsSettingsVersion_note_check" CHECK (
    "changeNote" IS NULL OR length("changeNote") <= 240
  )
);

CREATE UNIQUE INDEX "WorkspaceOperationsSettingsVersion_location_version_key"
  ON "WorkspaceOperationsSettingsVersion" ("organizationId", "locationId", "version")
  WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "WorkspaceOperationsSettingsVersion_org_version_key"
  ON "WorkspaceOperationsSettingsVersion" ("organizationId", "version")
  WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "WorkspaceOperationsSettingsVersion_active_location_key"
  ON "WorkspaceOperationsSettingsVersion" ("organizationId", "locationId")
  WHERE "isActive" = true AND "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "WorkspaceOperationsSettingsVersion_active_org_key"
  ON "WorkspaceOperationsSettingsVersion" ("organizationId")
  WHERE "isActive" = true AND "locationId" IS NULL;
CREATE INDEX "WorkspaceOperationsSettingsVersion_scope_createdAt_idx"
  ON "WorkspaceOperationsSettingsVersion" ("organizationId", "locationId", "createdAt");

ALTER TABLE "WorkspaceOperationsSettingsVersion"
  ADD CONSTRAINT "WorkspaceOperationsSettingsVersion_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "WorkspaceOperationsSettingsVersion_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "WorkspaceOperationsSettingsVersion_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

INSERT INTO "WorkspaceOperationsSettingsVersion" (
  "id", "organizationId", "version", "businessHours",
  "scheduleStartMinutes", "scheduleEndMinutes", "scheduleSlotMinutes",
  "guestBookingEnabled", "maxGuestsPerBooking", "guestRequiredFields",
  "showPublicEmail", "showPublicPhone", "showPublicWebsite", "showPublicAddress",
  "isActive", "changeNote"
)
SELECT
  'operations-org-' || md5("id"),
  "id",
  1,
  '{"MONDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"TUESDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"WEDNESDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"THURSDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"FRIDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"SATURDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"SUNDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}]}'::jsonb,
  420,
  1320,
  30,
  true,
  20,
  ARRAY['EMAIL']::text[],
  false,
  false,
  false,
  false,
  true,
  'Migrated current workspace behavior'
FROM "Organization";

CREATE FUNCTION create_organization_operations_settings() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "WorkspaceOperationsSettingsVersion" (
    "id", "organizationId", "version", "businessHours",
    "scheduleStartMinutes", "scheduleEndMinutes", "scheduleSlotMinutes",
    "guestBookingEnabled", "maxGuestsPerBooking", "guestRequiredFields",
    "showPublicEmail", "showPublicPhone", "showPublicWebsite", "showPublicAddress",
    "isActive", "changeNote"
  ) VALUES (
    'operations-org-' || md5(NEW."id"),
    NEW."id",
    1,
    '{"MONDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"TUESDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"WEDNESDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"THURSDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"FRIDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"SATURDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}],"SUNDAY":[{"opensAtMinutes":0,"closesAtMinutes":1440}]}'::jsonb,
    420,
    1320,
    30,
    true,
    20,
    ARRAY['EMAIL']::text[],
    false,
    false,
    false,
    false,
    true,
    'Created with organization'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Organization_create_operations_settings"
AFTER INSERT ON "Organization"
FOR EACH ROW EXECUTE FUNCTION create_organization_operations_settings();

CREATE FUNCTION protect_operations_settings_history() RETURNS trigger
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
    RAISE EXCEPTION 'Workspace operations settings versions cannot be deleted';
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
  RAISE EXCEPTION 'Workspace operations settings versions are immutable';
END;
$$;

CREATE TRIGGER "WorkspaceOperationsSettingsVersion_protect_history"
BEFORE UPDATE OR DELETE ON "WorkspaceOperationsSettingsVersion"
FOR EACH ROW EXECUTE FUNCTION protect_operations_settings_history();

ALTER TABLE "WorkspaceOperationsSettingsVersion" ENABLE ROW LEVEL SECURITY;
