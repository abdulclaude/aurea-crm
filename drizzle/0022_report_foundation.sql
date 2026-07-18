CREATE TYPE "public"."ReportViewVisibility" AS ENUM ('PERSONAL', 'LOCATION');
--> statement-breakpoint
CREATE TYPE "public"."ReportExportStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
--> statement-breakpoint
CREATE TYPE "public"."ReportExportFormat" AS ENUM ('CSV');
--> statement-breakpoint
CREATE TABLE "ReportSavedView" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text NOT NULL,
	"reportGroupId" text NOT NULL,
	"reportId" text NOT NULL,
	"name" text NOT NULL,
	"visibility" "ReportViewVisibility" DEFAULT 'PERSONAL' NOT NULL,
	"definition" jsonb NOT NULL,
	"schemaVersion" integer DEFAULT 1 NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"ownerId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"archivedAt" timestamp(3)
);
--> statement-breakpoint
ALTER TABLE "ReportSavedView" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "ReportExportRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text NOT NULL,
	"requestedById" text,
	"savedViewId" text,
	"reportGroupId" text NOT NULL,
	"reportId" text NOT NULL,
	"status" "ReportExportStatus" DEFAULT 'PENDING' NOT NULL,
	"format" "ReportExportFormat" DEFAULT 'CSV' NOT NULL,
	"definitionSnapshot" jsonb NOT NULL,
	"fieldSnapshot" jsonb NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"rowCount" integer,
	"fileName" text,
	"contentHash" text,
	"possiblePartial" boolean DEFAULT false NOT NULL,
	"failureMessage" text,
	"requestedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedAt" timestamp(3)
);
--> statement-breakpoint
ALTER TABLE "ReportExportRequest" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "ReportSavedView_scope_report_idx" ON "ReportSavedView" USING btree ("organizationId", "locationId", "reportGroupId", "reportId", "archivedAt");
--> statement-breakpoint
CREATE INDEX "ReportSavedView_owner_updatedAt_idx" ON "ReportSavedView" USING btree ("ownerId", "updatedAt");
--> statement-breakpoint
CREATE INDEX "ReportExportRequest_scope_requestedAt_idx" ON "ReportExportRequest" USING btree ("organizationId", "locationId", "requestedAt");
--> statement-breakpoint
CREATE INDEX "ReportExportRequest_status_idx" ON "ReportExportRequest" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "ReportSavedView" ADD CONSTRAINT "ReportSavedView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ReportSavedView" ADD CONSTRAINT "ReportSavedView_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ReportSavedView" ADD CONSTRAINT "ReportSavedView_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ReportExportRequest" ADD CONSTRAINT "ReportExportRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ReportExportRequest" ADD CONSTRAINT "ReportExportRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ReportExportRequest" ADD CONSTRAINT "ReportExportRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ReportExportRequest" ADD CONSTRAINT "ReportExportRequest_savedViewId_fkey" FOREIGN KEY ("savedViewId") REFERENCES "public"."ReportSavedView"("id") ON DELETE set null ON UPDATE cascade;
