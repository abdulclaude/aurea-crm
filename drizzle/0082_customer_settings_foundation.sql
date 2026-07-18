CREATE TABLE "CustomerFieldDefinition" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "description" text,
  "fieldType" text NOT NULL,
  "isRequired" boolean DEFAULT false NOT NULL,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CustomerFieldDefinition_key_format_check" CHECK ("key" ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT "CustomerFieldDefinition_type_check" CHECK ("fieldType" IN ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT')),
  CONSTRAINT "CustomerFieldDefinition_options_array_check" CHECK (jsonb_typeof("options") = 'array')
);

CREATE TABLE "CustomerTagDefinition" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "color" text,
  "description" text,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CustomerTagDefinition_color_check" CHECK ("color" IS NULL OR "color" ~ '^#[0-9a-fA-F]{6}$')
);

CREATE TABLE "CustomerNoteTemplate" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "description" text,
  "content" text NOT NULL,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "HouseholdSharingPolicyVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "version" integer NOT NULL,
  "values" jsonb NOT NULL,
  "isActive" boolean DEFAULT false NOT NULL,
  "changeNote" text,
  "createdById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "HouseholdSharingPolicyVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "HouseholdSharingPolicyVersion_values_object_check" CHECK (jsonb_typeof("values") = 'object'),
  CONSTRAINT "HouseholdSharingPolicyVersion_note_check" CHECK ("changeNote" IS NULL OR length("changeNote") <= 240)
);

CREATE UNIQUE INDEX "CustomerFieldDefinition_active_org_key" ON "CustomerFieldDefinition" ("organizationId", "key") WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CustomerFieldDefinition_active_location_key" ON "CustomerFieldDefinition" ("organizationId", "locationId", "key") WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
CREATE INDEX "CustomerFieldDefinition_scope_idx" ON "CustomerFieldDefinition" ("organizationId", "locationId", "updatedAt");
CREATE UNIQUE INDEX "CustomerTagDefinition_active_org_name" ON "CustomerTagDefinition" ("organizationId", lower("name")) WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CustomerTagDefinition_active_location_name" ON "CustomerTagDefinition" ("organizationId", "locationId", lower("name")) WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
CREATE INDEX "CustomerTagDefinition_scope_idx" ON "CustomerTagDefinition" ("organizationId", "locationId", "updatedAt");
CREATE UNIQUE INDEX "CustomerNoteTemplate_active_org_name" ON "CustomerNoteTemplate" ("organizationId", lower("name")) WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CustomerNoteTemplate_active_location_name" ON "CustomerNoteTemplate" ("organizationId", "locationId", lower("name")) WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
CREATE INDEX "CustomerNoteTemplate_scope_idx" ON "CustomerNoteTemplate" ("organizationId", "locationId", "updatedAt");
CREATE UNIQUE INDEX "HouseholdSharingPolicyVersion_org_version_key" ON "HouseholdSharingPolicyVersion" ("organizationId", "version") WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "HouseholdSharingPolicyVersion_location_version_key" ON "HouseholdSharingPolicyVersion" ("organizationId", "locationId", "version") WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "HouseholdSharingPolicyVersion_active_org_key" ON "HouseholdSharingPolicyVersion" ("organizationId") WHERE "locationId" IS NULL AND "isActive" = true;
CREATE UNIQUE INDEX "HouseholdSharingPolicyVersion_active_location_key" ON "HouseholdSharingPolicyVersion" ("organizationId", "locationId") WHERE "locationId" IS NOT NULL AND "isActive" = true;

ALTER TABLE "CustomerFieldDefinition" ADD CONSTRAINT "CustomerFieldDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CustomerFieldDefinition" ADD CONSTRAINT "CustomerFieldDefinition_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CustomerTagDefinition" ADD CONSTRAINT "CustomerTagDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CustomerTagDefinition" ADD CONSTRAINT "CustomerTagDefinition_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CustomerNoteTemplate" ADD CONSTRAINT "CustomerNoteTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CustomerNoteTemplate" ADD CONSTRAINT "CustomerNoteTemplate_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "HouseholdSharingPolicyVersion" ADD CONSTRAINT "HouseholdSharingPolicyVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "HouseholdSharingPolicyVersion" ADD CONSTRAINT "HouseholdSharingPolicyVersion_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;

ALTER TABLE "CustomerFieldDefinition" ADD CONSTRAINT "CustomerFieldDefinition_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerFieldDefinition" ADD CONSTRAINT "CustomerFieldDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerFieldDefinition" ADD CONSTRAINT "CustomerFieldDefinition_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerTagDefinition" ADD CONSTRAINT "CustomerTagDefinition_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerTagDefinition" ADD CONSTRAINT "CustomerTagDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerTagDefinition" ADD CONSTRAINT "CustomerTagDefinition_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerNoteTemplate" ADD CONSTRAINT "CustomerNoteTemplate_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerNoteTemplate" ADD CONSTRAINT "CustomerNoteTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CustomerNoteTemplate" ADD CONSTRAINT "CustomerNoteTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "HouseholdSharingPolicyVersion" ADD CONSTRAINT "HouseholdSharingPolicyVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

CREATE FUNCTION protect_household_sharing_policy_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM "Organization" WHERE "id" = OLD."organizationId")
      OR (OLD."locationId" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "Location"
        WHERE "organizationId" = OLD."organizationId" AND "id" = OLD."locationId"
      )) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Household sharing policy versions cannot be deleted';
  END IF;
  IF OLD."createdById" IS NOT NULL
    AND NEW."createdById" IS NULL
    AND (to_jsonb(NEW) - 'createdById') = (to_jsonb(OLD) - 'createdById') THEN
    RETURN NEW;
  END IF;
  IF OLD."isActive" = true
    AND NEW."isActive" = false
    AND (to_jsonb(NEW) - 'isActive') = (to_jsonb(OLD) - 'isActive') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Household sharing policy versions are immutable';
END;
$$;

CREATE TRIGGER "HouseholdSharingPolicyVersion_protect_history"
BEFORE UPDATE OR DELETE ON "HouseholdSharingPolicyVersion"
FOR EACH ROW EXECUTE FUNCTION protect_household_sharing_policy_history();

ALTER TABLE "CustomerFieldDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTagDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerNoteTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HouseholdSharingPolicyVersion" ENABLE ROW LEVEL SECURITY;
