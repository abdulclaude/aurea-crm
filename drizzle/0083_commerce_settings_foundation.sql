-- Draft migration: canonical schema exports and journal entry are intentionally owned by integration.
CREATE TABLE "CommerceTaxRate" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "rateBasisPoints" integer NOT NULL,
  "kind" text NOT NULL,
  "description" text,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommerceTaxRate_rate_basis_points_check" CHECK ("rateBasisPoints" >= 0 AND "rateBasisPoints" <= 10000),
  CONSTRAINT "CommerceTaxRate_kind_check" CHECK ("kind" IN ('EXCLUSIVE', 'INCLUSIVE')),
  CONSTRAINT "CommerceTaxRate_code_format_check" CHECK ("code" ~ '^[A-Z0-9_-]+$')
);

CREATE TABLE "CommerceTaxAssignment" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "subjectType" text NOT NULL,
  "lineType" text,
  "productId" text,
  "taxRateId" text,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommerceTaxAssignment_subject_check" CHECK (("subjectType" = 'LINE_TYPE' AND "lineType" IN ('MEMBERSHIP', 'CLASS', 'ADD_ON', 'GIFT_CARD', 'RETAIL', 'OTHER') AND "productId" IS NULL) OR ("subjectType" = 'PRODUCT' AND "productId" IS NOT NULL AND "lineType" IS NULL))
);

CREATE TABLE "CommerceRevenueCategory" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "description" text,
  "accountingAccountReference" text,
  "accountingAccountName" text,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommerceRevenueCategory_code_format_check" CHECK ("code" ~ '^[A-Z0-9_-]+$')
);

CREATE TABLE "CommerceOfflinePaymentMethod" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "instructions" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "archivedAt" timestamp(3),
  "archivedById" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommerceOfflinePaymentMethod_kind_check" CHECK ("kind" IN ('CASH', 'CARD_TERMINAL', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'))
);

CREATE TABLE "CommerceDocumentDefaults" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "invoicePrefix" text,
  "invoiceDueDays" integer,
  "invoiceFooter" text,
  "receiptFooter" text,
  "defaultRevenueCategoryId" text,
  "createdById" text,
  "updatedById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommerceDocumentDefaults_invoice_due_days_check" CHECK ("invoiceDueDays" IS NULL OR ("invoiceDueDays" >= 0 AND "invoiceDueDays" <= 365))
);

CREATE TABLE "CommerceGuestPassPolicyVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "version" integer NOT NULL,
  "values" jsonb NOT NULL,
  "isActive" boolean DEFAULT false NOT NULL,
  "changeNote" text,
  "createdById" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommerceGuestPassPolicyVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "CommerceGuestPassPolicyVersion_values_object_check" CHECK (jsonb_typeof("values") = 'object'),
  CONSTRAINT "CommerceGuestPassPolicyVersion_note_check" CHECK ("changeNote" IS NULL OR length("changeNote") <= 240)
);

CREATE UNIQUE INDEX "CommerceTaxRate_active_org_code_key" ON "CommerceTaxRate" ("organizationId", "code") WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CommerceTaxRate_active_location_code_key" ON "CommerceTaxRate" ("organizationId", "locationId", "code") WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
CREATE INDEX "CommerceTaxRate_scope_idx" ON "CommerceTaxRate" ("organizationId", "locationId", "updatedAt");
CREATE UNIQUE INDEX "CommerceTaxRate_organization_id_key" ON "CommerceTaxRate" ("organizationId", "id");
CREATE UNIQUE INDEX "CommerceTaxAssignment_active_line_type_key" ON "CommerceTaxAssignment" ("organizationId", "lineType") WHERE "locationId" IS NULL AND "subjectType" = 'LINE_TYPE' AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CommerceTaxAssignment_active_location_line_type_key" ON "CommerceTaxAssignment" ("organizationId", "locationId", "lineType") WHERE "locationId" IS NOT NULL AND "subjectType" = 'LINE_TYPE' AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CommerceTaxAssignment_active_product_key" ON "CommerceTaxAssignment" ("organizationId", "productId") WHERE "subjectType" = 'PRODUCT' AND "archivedAt" IS NULL;
CREATE INDEX "CommerceTaxAssignment_scope_idx" ON "CommerceTaxAssignment" ("organizationId", "locationId", "updatedAt");
CREATE UNIQUE INDEX "CommerceRevenueCategory_active_org_code_key" ON "CommerceRevenueCategory" ("organizationId", "code") WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CommerceRevenueCategory_active_location_code_key" ON "CommerceRevenueCategory" ("organizationId", "locationId", "code") WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
CREATE INDEX "CommerceRevenueCategory_scope_idx" ON "CommerceRevenueCategory" ("organizationId", "locationId", "updatedAt");
CREATE UNIQUE INDEX "CommerceRevenueCategory_organization_id_key" ON "CommerceRevenueCategory" ("organizationId", "id");
CREATE UNIQUE INDEX "CommerceOfflinePaymentMethod_active_org_name_key" ON "CommerceOfflinePaymentMethod" ("organizationId", lower("name")) WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "CommerceOfflinePaymentMethod_active_location_name_key" ON "CommerceOfflinePaymentMethod" ("organizationId", "locationId", lower("name")) WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
CREATE INDEX "CommerceOfflinePaymentMethod_scope_idx" ON "CommerceOfflinePaymentMethod" ("organizationId", "locationId", "updatedAt");
CREATE UNIQUE INDEX "CommerceDocumentDefaults_org_scope_key" ON "CommerceDocumentDefaults" ("organizationId") WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "CommerceDocumentDefaults_location_scope_key" ON "CommerceDocumentDefaults" ("organizationId", "locationId") WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "CommerceGuestPassPolicyVersion_org_version_key" ON "CommerceGuestPassPolicyVersion" ("organizationId", "version") WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "CommerceGuestPassPolicyVersion_location_version_key" ON "CommerceGuestPassPolicyVersion" ("organizationId", "locationId", "version") WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "CommerceGuestPassPolicyVersion_active_org_key" ON "CommerceGuestPassPolicyVersion" ("organizationId") WHERE "locationId" IS NULL AND "isActive" = true;
CREATE UNIQUE INDEX "CommerceGuestPassPolicyVersion_active_location_key" ON "CommerceGuestPassPolicyVersion" ("organizationId", "locationId") WHERE "locationId" IS NOT NULL AND "isActive" = true;

ALTER TABLE "CommerceTaxRate" ADD CONSTRAINT "CommerceTaxRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceTaxRate" ADD CONSTRAINT "CommerceTaxRate_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceTaxAssignment" ADD CONSTRAINT "CommerceTaxAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceTaxAssignment" ADD CONSTRAINT "CommerceTaxAssignment_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceTaxAssignment" ADD CONSTRAINT "CommerceTaxAssignment_scope_taxRateId_fkey" FOREIGN KEY ("organizationId", "taxRateId") REFERENCES "CommerceTaxRate"("organizationId", "id") ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE "CommerceTaxAssignment" ADD CONSTRAINT "CommerceTaxAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StudioProduct"("id") ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE "CommerceRevenueCategory" ADD CONSTRAINT "CommerceRevenueCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceRevenueCategory" ADD CONSTRAINT "CommerceRevenueCategory_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceOfflinePaymentMethod" ADD CONSTRAINT "CommerceOfflinePaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceOfflinePaymentMethod" ADD CONSTRAINT "CommerceOfflinePaymentMethod_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceDocumentDefaults" ADD CONSTRAINT "CommerceDocumentDefaults_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceDocumentDefaults" ADD CONSTRAINT "CommerceDocumentDefaults_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceDocumentDefaults" ADD CONSTRAINT "CommerceDocumentDefaults_scope_defaultRevenueCategoryId_fkey" FOREIGN KEY ("organizationId", "defaultRevenueCategoryId") REFERENCES "CommerceRevenueCategory"("organizationId", "id") ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE "CommerceGuestPassPolicyVersion" ADD CONSTRAINT "CommerceGuestPassPolicyVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE "CommerceGuestPassPolicyVersion" ADD CONSTRAINT "CommerceGuestPassPolicyVersion_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE RESTRICT ON DELETE CASCADE;

ALTER TABLE "CommerceTaxRate" ADD CONSTRAINT "CommerceTaxRate_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceTaxRate" ADD CONSTRAINT "CommerceTaxRate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceTaxRate" ADD CONSTRAINT "CommerceTaxRate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceTaxAssignment" ADD CONSTRAINT "CommerceTaxAssignment_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceTaxAssignment" ADD CONSTRAINT "CommerceTaxAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceTaxAssignment" ADD CONSTRAINT "CommerceTaxAssignment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceRevenueCategory" ADD CONSTRAINT "CommerceRevenueCategory_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceRevenueCategory" ADD CONSTRAINT "CommerceRevenueCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceRevenueCategory" ADD CONSTRAINT "CommerceRevenueCategory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceOfflinePaymentMethod" ADD CONSTRAINT "CommerceOfflinePaymentMethod_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceOfflinePaymentMethod" ADD CONSTRAINT "CommerceOfflinePaymentMethod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceOfflinePaymentMethod" ADD CONSTRAINT "CommerceOfflinePaymentMethod_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceDocumentDefaults" ADD CONSTRAINT "CommerceDocumentDefaults_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceDocumentDefaults" ADD CONSTRAINT "CommerceDocumentDefaults_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE "CommerceGuestPassPolicyVersion" ADD CONSTRAINT "CommerceGuestPassPolicyVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE RESTRICT ON DELETE SET NULL;

CREATE FUNCTION enforce_commerce_settings_scope_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'CommerceTaxAssignment' THEN
    IF NEW."taxRateId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "CommerceTaxRate"
      WHERE "id" = NEW."taxRateId"
        AND "organizationId" = NEW."organizationId"
        AND "locationId" IS NOT DISTINCT FROM NEW."locationId"
    ) THEN
      RAISE EXCEPTION 'Commerce tax assignment contains a cross-scope tax rate';
    END IF;
    IF NEW."productId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "StudioProduct"
      WHERE "id" = NEW."productId"
        AND "organizationId" = NEW."organizationId"
        AND "locationId" IS NOT DISTINCT FROM NEW."locationId"
    ) THEN
      RAISE EXCEPTION 'Commerce tax assignment contains a cross-scope product';
    END IF;
  ELSIF TG_TABLE_NAME = 'CommerceDocumentDefaults'
    AND NEW."defaultRevenueCategoryId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "CommerceRevenueCategory"
      WHERE "id" = NEW."defaultRevenueCategoryId"
        AND "organizationId" = NEW."organizationId"
        AND "locationId" IS NOT DISTINCT FROM NEW."locationId"
    ) THEN
    RAISE EXCEPTION 'Commerce document defaults contain a cross-scope revenue category';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CommerceTaxAssignment_scope_integrity"
BEFORE INSERT OR UPDATE ON "CommerceTaxAssignment"
FOR EACH ROW EXECUTE FUNCTION enforce_commerce_settings_scope_integrity();

CREATE TRIGGER "CommerceDocumentDefaults_scope_integrity"
BEFORE INSERT OR UPDATE ON "CommerceDocumentDefaults"
FOR EACH ROW EXECUTE FUNCTION enforce_commerce_settings_scope_integrity();

CREATE FUNCTION protect_commerce_product_assignment_scope() RETURNS trigger
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
    SELECT 1 FROM "CommerceTaxAssignment"
    WHERE "productId" = OLD."id"
      AND "archivedAt" IS NULL
      AND (
        "organizationId" IS DISTINCT FROM NEW."organizationId"
        OR "locationId" IS DISTINCT FROM NEW."locationId"
      )
  ) THEN
    RAISE EXCEPTION 'A product with an active tax assignment cannot move between settings scopes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StudioProduct_tax_assignment_scope_protect"
BEFORE UPDATE OF "organizationId", "locationId" ON "StudioProduct"
FOR EACH ROW EXECUTE FUNCTION protect_commerce_product_assignment_scope();

CREATE FUNCTION protect_commerce_guest_pass_policy_history() RETURNS trigger
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
    RAISE EXCEPTION 'Commerce guest pass policy versions cannot be deleted';
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
  RAISE EXCEPTION 'Commerce guest pass policy versions are immutable';
END;
$$;

CREATE TRIGGER "CommerceGuestPassPolicyVersion_protect_history"
BEFORE UPDATE OR DELETE ON "CommerceGuestPassPolicyVersion"
FOR EACH ROW EXECUTE FUNCTION protect_commerce_guest_pass_policy_history();

ALTER TABLE "CommerceTaxRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommerceTaxAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommerceRevenueCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommerceOfflinePaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommerceDocumentDefaults" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommerceGuestPassPolicyVersion" ENABLE ROW LEVEL SECURITY;
