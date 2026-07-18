CREATE TABLE "StaffOperationsPolicy" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "currentVersion" integer DEFAULT 0 NOT NULL,
  "createdById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "StaffOperationsPolicy_currentVersion_check" CHECK ("currentVersion" >= 0)
);

CREATE TABLE "StaffOperationsPolicyVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "policyId" text NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "version" integer NOT NULL,
  "publicInstructorProfilesByDefault" boolean NOT NULL,
  "availabilityMode" text NOT NULL,
  "staffCanEditAvailability" boolean NOT NULL,
  "shiftSwapRequiresApproval" boolean NOT NULL,
  "timeOffRequiresApproval" boolean NOT NULL,
  "timeClockRoundingMinutes" integer NOT NULL,
  "breakRequiredAfterMinutes" integer,
  "minimumBreakMinutes" integer NOT NULL,
  "timeEntryApprovalMode" text NOT NULL,
  "effectiveFrom" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "changeNote" text,
  "createdById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "StaffOperationsPolicyVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "StaffOperationsPolicyVersion_availabilityMode_check" CHECK ("availabilityMode" IN ('AVAILABILITY_REQUIRED', 'ROTA_REQUIRED')),
  CONSTRAINT "StaffOperationsPolicyVersion_rounding_check" CHECK ("timeClockRoundingMinutes" IN (1, 5, 6, 10, 15, 30)),
  CONSTRAINT "StaffOperationsPolicyVersion_break_check" CHECK (
    ("breakRequiredAfterMinutes" IS NULL AND "minimumBreakMinutes" = 0)
    OR ("breakRequiredAfterMinutes" BETWEEN 1 AND 1440 AND "minimumBreakMinutes" BETWEEN 1 AND 240 AND "minimumBreakMinutes" < "breakRequiredAfterMinutes")
  ),
  CONSTRAINT "StaffOperationsPolicyVersion_approval_check" CHECK ("timeEntryApprovalMode" IN ('MANAGER_REQUIRED', 'AUTO_APPROVE')),
  CONSTRAINT "StaffOperationsPolicyVersion_note_check" CHECK ("changeNote" IS NULL OR length("changeNote") <= 240)
);

CREATE TABLE "StaffCompensationTemplate" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "description" text,
  "currentVersion" integer DEFAULT 0 NOT NULL,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "StaffCompensationTemplate_name_check" CHECK (length(trim("name")) BETWEEN 1 AND 120),
  CONSTRAINT "StaffCompensationTemplate_currentVersion_check" CHECK ("currentVersion" >= 0)
);

CREATE TABLE "StaffCompensationTemplateVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "templateId" text NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "version" integer NOT NULL,
  "compensationBasis" text DEFAULT 'HOURLY_RATE' NOT NULL,
  "hourlyRate" numeric(12, 2) NOT NULL,
  "currency" text NOT NULL,
  "effectiveFrom" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "changeNote" text,
  "createdById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "StaffCompensationTemplateVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "StaffCompensationTemplateVersion_basis_check" CHECK ("compensationBasis" = 'HOURLY_RATE'),
  CONSTRAINT "StaffCompensationTemplateVersion_rate_check" CHECK ("hourlyRate" >= 0),
  CONSTRAINT "StaffCompensationTemplateVersion_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "StaffCompensationTemplateVersion_note_check" CHECK ("changeNote" IS NULL OR length("changeNote") <= 240)
);

CREATE TABLE "StaffCompensationAssignment" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "instructorId" text NOT NULL,
  "templateVersionId" text NOT NULL,
  "effectiveFrom" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "effectiveTo" timestamp(3),
  "assignedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "StaffCompensationAssignment_effective_range_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);

CREATE UNIQUE INDEX "StaffOperationsPolicy_org_scope_key"
  ON "StaffOperationsPolicy" ("organizationId") WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "StaffOperationsPolicy_location_scope_key"
  ON "StaffOperationsPolicy" ("organizationId", "locationId") WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "StaffOperationsPolicy_organization_id_key"
  ON "StaffOperationsPolicy" ("organizationId", "id");
CREATE UNIQUE INDEX "StaffOperationsPolicyVersion_policy_version_key"
  ON "StaffOperationsPolicyVersion" ("policyId", "version");
CREATE INDEX "StaffOperationsPolicyVersion_scope_effective_idx"
  ON "StaffOperationsPolicyVersion" ("organizationId", "locationId", "effectiveFrom");
CREATE UNIQUE INDEX "StaffCompensationTemplate_active_org_name_key"
  ON "StaffCompensationTemplate" ("organizationId", lower("name")) WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "StaffCompensationTemplate_active_location_name_key"
  ON "StaffCompensationTemplate" ("organizationId", "locationId", lower("name")) WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "StaffCompensationTemplateVersion_template_version_key"
  ON "StaffCompensationTemplateVersion" ("templateId", "version");
CREATE UNIQUE INDEX "StaffCompensationTemplate_organization_id_key"
  ON "StaffCompensationTemplate" ("organizationId", "id");
CREATE UNIQUE INDEX "StaffCompensationTemplateVersion_organization_id_key"
  ON "StaffCompensationTemplateVersion" ("organizationId", "id");
CREATE INDEX "StaffCompensationAssignment_instructor_effectiveFrom_idx"
  ON "StaffCompensationAssignment" ("organizationId", "instructorId", "effectiveFrom");
CREATE UNIQUE INDEX "StaffCompensationAssignment_active_org_instructor_key"
  ON "StaffCompensationAssignment" ("organizationId", "instructorId") WHERE "locationId" IS NULL AND "effectiveTo" IS NULL;
CREATE UNIQUE INDEX "StaffCompensationAssignment_active_location_instructor_key"
  ON "StaffCompensationAssignment" ("organizationId", "locationId", "instructorId") WHERE "locationId" IS NOT NULL AND "effectiveTo" IS NULL;

ALTER TABLE "StaffOperationsPolicy"
  ADD CONSTRAINT "StaffOperationsPolicy_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffOperationsPolicy_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffOperationsPolicy_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

ALTER TABLE "StaffOperationsPolicyVersion"
  ADD CONSTRAINT "StaffOperationsPolicyVersion_scope_policy_fkey"
    FOREIGN KEY ("organizationId", "policyId") REFERENCES "StaffOperationsPolicy"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffOperationsPolicyVersion_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffOperationsPolicyVersion_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

ALTER TABLE "StaffCompensationTemplate"
  ADD CONSTRAINT "StaffCompensationTemplate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffCompensationTemplate_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffCompensationTemplate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL,
  ADD CONSTRAINT "StaffCompensationTemplate_archivedById_fkey"
    FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

ALTER TABLE "StaffCompensationTemplateVersion"
  ADD CONSTRAINT "StaffCompensationTemplateVersion_scope_template_fkey"
    FOREIGN KEY ("organizationId", "templateId") REFERENCES "StaffCompensationTemplate"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffCompensationTemplateVersion_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffCompensationTemplateVersion_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

ALTER TABLE "StaffCompensationAssignment"
  ADD CONSTRAINT "StaffCompensationAssignment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffCompensationAssignment_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE,
  ADD CONSTRAINT "StaffCompensationAssignment_instructorId_fkey"
    FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT "StaffCompensationAssignment_scope_templateVersion_fkey"
    FOREIGN KEY ("organizationId", "templateVersionId") REFERENCES "StaffCompensationTemplateVersion"("organizationId", "id") ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT "StaffCompensationAssignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

CREATE FUNCTION enforce_staff_settings_scope_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_location text;
  parent_organization text;
BEGIN
  IF TG_TABLE_NAME = 'StaffOperationsPolicyVersion' THEN
    SELECT "organizationId", "locationId" INTO parent_organization, parent_location
    FROM "StaffOperationsPolicy" WHERE "id" = NEW."policyId";
  ELSIF TG_TABLE_NAME = 'StaffCompensationTemplateVersion' THEN
    SELECT "organizationId", "locationId" INTO parent_organization, parent_location
    FROM "StaffCompensationTemplate" WHERE "id" = NEW."templateId";
  ELSIF TG_TABLE_NAME = 'StaffCompensationAssignment' THEN
    SELECT "organizationId", "locationId" INTO parent_organization, parent_location
    FROM "StaffCompensationTemplateVersion" WHERE "id" = NEW."templateVersionId";
    IF parent_organization IS DISTINCT FROM NEW."organizationId"
      OR parent_location IS DISTINCT FROM NEW."locationId" THEN
      RAISE EXCEPTION 'Staff compensation assignment contains a cross-scope template version';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM "Instructor"
      WHERE "id" = NEW."instructorId"
        AND "organizationId" = NEW."organizationId"
        AND (NEW."locationId" IS NULL OR "locationId" = NEW."locationId")
    ) THEN
      RAISE EXCEPTION 'Staff compensation assignment contains a cross-scope instructor';
    END IF;
    RETURN NEW;
  END IF;

  IF parent_organization IS DISTINCT FROM NEW."organizationId"
    OR parent_location IS DISTINCT FROM NEW."locationId" THEN
    RAISE EXCEPTION 'Staff settings version contains a cross-scope parent';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StaffOperationsPolicyVersion_scope_integrity"
BEFORE INSERT OR UPDATE ON "StaffOperationsPolicyVersion"
FOR EACH ROW EXECUTE FUNCTION enforce_staff_settings_scope_integrity();

CREATE TRIGGER "StaffCompensationTemplateVersion_scope_integrity"
BEFORE INSERT OR UPDATE ON "StaffCompensationTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION enforce_staff_settings_scope_integrity();

CREATE TRIGGER "StaffCompensationAssignment_scope_integrity"
BEFORE INSERT OR UPDATE ON "StaffCompensationAssignment"
FOR EACH ROW EXECUTE FUNCTION enforce_staff_settings_scope_integrity();

CREATE FUNCTION enforce_staff_settings_current_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."currentVersion" = 0 THEN
    IF TG_OP = 'UPDATE' AND OLD."currentVersion" > 0 THEN
      RAISE EXCEPTION 'Staff settings current version cannot be reset to zero';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'StaffOperationsPolicy' AND NOT EXISTS (
    SELECT 1
    FROM "StaffOperationsPolicyVersion"
    WHERE "policyId" = NEW."id"
      AND "organizationId" = NEW."organizationId"
      AND "locationId" IS NOT DISTINCT FROM NEW."locationId"
      AND "version" = NEW."currentVersion"
  ) THEN
    RAISE EXCEPTION 'Staff operations current version does not exist in the same scope';
  END IF;

  IF TG_TABLE_NAME = 'StaffCompensationTemplate' AND NOT EXISTS (
    SELECT 1
    FROM "StaffCompensationTemplateVersion"
    WHERE "templateId" = NEW."id"
      AND "organizationId" = NEW."organizationId"
      AND "locationId" IS NOT DISTINCT FROM NEW."locationId"
      AND "version" = NEW."currentVersion"
  ) THEN
    RAISE EXCEPTION 'Staff compensation current version does not exist in the same scope';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "StaffOperationsPolicy_current_version_integrity"
AFTER INSERT OR UPDATE ON "StaffOperationsPolicy"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_staff_settings_current_version();

CREATE CONSTRAINT TRIGGER "StaffCompensationTemplate_current_version_integrity"
AFTER INSERT OR UPDATE ON "StaffCompensationTemplate"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_staff_settings_current_version();

CREATE FUNCTION protect_instructor_compensation_scope() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."organizationId" IS NOT DISTINCT FROM NEW."organizationId"
    AND OLD."locationId" IS NOT DISTINCT FROM NEW."locationId" THEN
    RETURN NEW;
  END IF;
  IF OLD."locationId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Location"
    WHERE "id" = OLD."locationId" AND "organizationId" = OLD."organizationId"
  ) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM "StaffCompensationAssignment"
    WHERE "instructorId" = OLD."id"
      AND "effectiveTo" IS NULL
      AND (
        "organizationId" IS DISTINCT FROM NEW."organizationId"
        OR (
          "locationId" IS NOT NULL
          AND "locationId" IS DISTINCT FROM NEW."locationId"
        )
      )
  ) THEN
    RAISE EXCEPTION 'An instructor with active compensation cannot move between settings scopes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Instructor_compensation_scope_protect"
BEFORE UPDATE OF "organizationId", "locationId" ON "Instructor"
FOR EACH ROW EXECUTE FUNCTION protect_instructor_compensation_scope();

CREATE FUNCTION protect_staff_operations_policy_version_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM "StaffOperationsPolicy" WHERE "id" = OLD."policyId"
  ) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'DELETE' AND (
    NOT EXISTS (SELECT 1 FROM "Organization" WHERE "id" = OLD."organizationId")
    OR (OLD."locationId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "Location"
      WHERE "organizationId" = OLD."organizationId" AND "id" = OLD."locationId"
    ))
  ) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
    AND OLD."createdById" IS NOT NULL
    AND NEW."createdById" IS NULL
    AND (to_jsonb(NEW) - 'createdById') = (to_jsonb(OLD) - 'createdById') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Staff operations policy versions are immutable';
END;
$$;

CREATE FUNCTION protect_staff_compensation_template_version_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM "StaffCompensationTemplate" WHERE "id" = OLD."templateId"
  ) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'DELETE' AND (
    NOT EXISTS (SELECT 1 FROM "Organization" WHERE "id" = OLD."organizationId")
    OR (OLD."locationId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "Location"
      WHERE "organizationId" = OLD."organizationId" AND "id" = OLD."locationId"
    ))
  ) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
    AND OLD."createdById" IS NOT NULL
    AND NEW."createdById" IS NULL
    AND (to_jsonb(NEW) - 'createdById') = (to_jsonb(OLD) - 'createdById') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Staff compensation template versions are immutable';
END;
$$;

CREATE TRIGGER "StaffOperationsPolicyVersion_protect_history"
BEFORE UPDATE OR DELETE ON "StaffOperationsPolicyVersion"
FOR EACH ROW EXECUTE FUNCTION protect_staff_operations_policy_version_history();

CREATE TRIGGER "StaffCompensationTemplateVersion_protect_history"
BEFORE UPDATE OR DELETE ON "StaffCompensationTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION protect_staff_compensation_template_version_history();

ALTER TABLE "StaffOperationsPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffOperationsPolicyVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffCompensationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffCompensationTemplateVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffCompensationAssignment" ENABLE ROW LEVEL SECURITY;
