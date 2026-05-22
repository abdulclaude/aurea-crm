CREATE TYPE "public"."ClientDocumentType" AS ENUM('WAIVER', 'CONTRACT_SIGNATURE', 'PROFILE_FILE', 'SALE_IMAGE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."StudioProductType" AS ENUM('MEMBERSHIP_PLAN', 'CLASS_PACK', 'RETAIL', 'FEE', 'ACCOUNT_CREDIT', 'SHIPPING', 'TIP', 'EXTERNAL_REVENUE', 'GIFT_CARD', 'OTHER');--> statement-breakpoint
ALTER TYPE "public"."StudioCheckInMethod" ADD VALUE 'IMPORT';--> statement-breakpoint
CREATE TABLE "ClientDocument" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"clientId" text NOT NULL,
	"membershipId" text,
	"source" "ImportSource" DEFAULT 'MINDBODY' NOT NULL,
	"sourcePath" text,
	"fileName" text NOT NULL,
	"fileType" text,
	"storageUrl" text,
	"documentType" "ClientDocumentType" DEFAULT 'OTHER' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ClientDocument" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioProduct" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"externalId" text,
	"sku" text,
	"name" text NOT NULL,
	"description" text,
	"type" "StudioProductType" DEFAULT 'OTHER' NOT NULL,
	"category" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(10, 2),
	"currency" text DEFAULT 'GBP' NOT NULL,
	"taxRate" numeric(5, 2),
	"trackInventory" boolean DEFAULT false NOT NULL,
	"stockQuantity" integer,
	"lowStockThreshold" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "StudioProduct" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ClassCredit" DROP CONSTRAINT "ClassCredit_membershipId_fkey";
--> statement-breakpoint
ALTER TABLE "ClassCredit" ALTER COLUMN "membershipId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioMembership" ALTER COLUMN "price" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "CheckIn" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD COLUMN "organizationId" text;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD COLUMN "locationId" text;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD COLUMN "externalId" text;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD COLUMN "paymentRefNo" text;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD COLUMN "productId" text;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "mindbodyId" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "barcodeId" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "firstName" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "middleName" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "lastName" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "homePhone" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "workPhone" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "mobilePhone" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "addressLine1" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "addressLine2" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "postalCode" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "dateOfBirth" timestamp (3);--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "emergencyContactRelation" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "emergencyContactEmail" text;--> statement-breakpoint
ALTER TABLE "Client" ADD COLUMN "notificationPrefs" jsonb;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD COLUMN "locationId" text;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD COLUMN "importConfig" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD COLUMN "entityCounts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD COLUMN "entityProgress" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD COLUMN "sourceFilenames" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ImportJob" ADD COLUMN "warningLog" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD COLUMN "missingFields" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN "mindbodyTrainerId" text;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN "commissionConfig" jsonb;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN "employmentStart" timestamp (3);--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN "employmentEnd" timestamp (3);--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN "isSystem" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Location" ADD COLUMN "externalId" text;--> statement-breakpoint
ALTER TABLE "Location" ADD COLUMN "contactName" text;--> statement-breakpoint
ALTER TABLE "Location" ADD COLUMN "taxGrouping" text;--> statement-breakpoint
ALTER TABLE "Location" ADD COLUMN "taxRates" jsonb;--> statement-breakpoint
ALTER TABLE "Location" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "Location" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "Location" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD COLUMN "paymentMethod" text;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD COLUMN "paymentFrequency" text;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD COLUMN "suspendNotes" text;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD COLUMN "totalPayments" integer;--> statement-breakpoint
ALTER TABLE "StudioMembership" ADD COLUMN "remainingPayments" integer;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD COLUMN "productId" text;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD COLUMN "externalId" text;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD COLUMN "mindbodyPmtRefNo" text;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD COLUMN "paymentMethod" text;--> statement-breakpoint
ALTER TABLE "StudioPayment" ADD COLUMN "taxAmount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."StudioMembership"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioProduct" ADD CONSTRAINT "StudioProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioProduct" ADD CONSTRAINT "StudioProduct_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ClientDocument_clientId_idx" ON "ClientDocument" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "ClientDocument_documentType_idx" ON "ClientDocument" USING btree ("documentType");--> statement-breakpoint
CREATE INDEX "ClientDocument_locationId_idx" ON "ClientDocument" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "ClientDocument_membershipId_idx" ON "ClientDocument" USING btree ("membershipId");--> statement-breakpoint
CREATE INDEX "ClientDocument_organizationId_idx" ON "ClientDocument" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "ClientDocument_organizationId_sourcePath_key" ON "ClientDocument" USING btree ("organizationId","sourcePath");--> statement-breakpoint
CREATE INDEX "StudioProduct_category_idx" ON "StudioProduct" USING btree ("category");--> statement-breakpoint
CREATE INDEX "StudioProduct_isActive_idx" ON "StudioProduct" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "StudioProduct_locationId_idx" ON "StudioProduct" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "StudioProduct_organizationId_idx" ON "StudioProduct" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "StudioProduct_organizationId_locationId_idx" ON "StudioProduct" USING btree ("organizationId","locationId");--> statement-breakpoint
CREATE INDEX "StudioProduct_type_idx" ON "StudioProduct" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "StudioProduct_organizationId_externalId_key" ON "StudioProduct" USING btree ("organizationId","externalId");--> statement-breakpoint
CREATE UNIQUE INDEX "StudioProduct_organizationId_sku_key" ON "StudioProduct" USING btree ("organizationId","sku");--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD CONSTRAINT "ClassCredit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD CONSTRAINT "ClassCredit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClassCredit" ADD CONSTRAINT "ClassCredit_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."StudioMembership"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ClassCredit_externalId_idx" ON "ClassCredit" USING btree ("externalId");--> statement-breakpoint
CREATE INDEX "ClassCredit_locationId_idx" ON "ClassCredit" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "ClassCredit_organizationId_idx" ON "ClassCredit" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "ClassCredit_paymentRefNo_idx" ON "ClassCredit" USING btree ("paymentRefNo");--> statement-breakpoint
CREATE INDEX "ClassCredit_productId_idx" ON "ClassCredit" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "Client_barcodeId_idx" ON "Client" USING btree ("barcodeId");--> statement-breakpoint
CREATE INDEX "Client_mindbodyId_idx" ON "Client" USING btree ("mindbodyId");--> statement-breakpoint
CREATE UNIQUE INDEX "Client_organizationId_barcodeId_key" ON "Client" USING btree ("organizationId","barcodeId");--> statement-breakpoint
CREATE UNIQUE INDEX "Client_organizationId_mindbodyId_key" ON "Client" USING btree ("organizationId","mindbodyId");--> statement-breakpoint
CREATE INDEX "ImportJob_locationId_idx" ON "ImportJob" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "Instructor_mindbodyTrainerId_idx" ON "Instructor" USING btree ("mindbodyTrainerId");--> statement-breakpoint
CREATE UNIQUE INDEX "Instructor_organizationId_mindbodyTrainerId_key" ON "Instructor" USING btree ("organizationId","mindbodyTrainerId");--> statement-breakpoint
CREATE INDEX "Location_externalId_idx" ON "Location" USING btree ("externalId");--> statement-breakpoint
CREATE INDEX "Location_isActive_idx" ON "Location" USING btree ("isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "Location_organizationId_externalId_key" ON "Location" USING btree ("organizationId","externalId");--> statement-breakpoint
CREATE INDEX "StudioPayment_externalId_idx" ON "StudioPayment" USING btree ("externalId");--> statement-breakpoint
CREATE INDEX "StudioPayment_mindbodyPmtRefNo_idx" ON "StudioPayment" USING btree ("mindbodyPmtRefNo");--> statement-breakpoint
CREATE INDEX "StudioPayment_paymentMethod_idx" ON "StudioPayment" USING btree ("paymentMethod");--> statement-breakpoint
CREATE INDEX "StudioPayment_productId_idx" ON "StudioPayment" USING btree ("productId");