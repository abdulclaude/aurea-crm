CREATE TYPE "public"."PublicationTargetKind" AS ENUM ('FUNNEL', 'SCHEDULE', 'PRICING', 'FORM', 'GIFT_CARDS', 'WIDGET');
--> statement-breakpoint
CREATE TYPE "public"."PublicationTargetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');
--> statement-breakpoint
CREATE TYPE "public"."PublicationDomainStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'VERIFIED', 'ERROR');
--> statement-breakpoint
CREATE TYPE "public"."PublicationSslStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'ACTIVE', 'ERROR');
--> statement-breakpoint
CREATE TABLE "PublicationTarget" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"kind" "PublicationTargetKind" NOT NULL,
	"sourceKey" text NOT NULL,
	"sourceId" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "PublicationTargetStatus" DEFAULT 'DRAFT' NOT NULL,
	"themePresetId" text,
	"publishedVersionId" text,
	"domainHost" text,
	"domainVerificationToken" text NOT NULL,
	"domainStatus" "PublicationDomainStatus" DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"sslStatus" "PublicationSslStatus" DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"domainCheckedAt" timestamp(3),
	"domainError" text,
	"seoConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consentConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"channelConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"publishedAt" timestamp(3),
	"createdById" text,
	"updatedById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PublicationTarget" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "PublicationVersion" (
	"id" text PRIMARY KEY NOT NULL,
	"targetId" text NOT NULL,
	"version" integer NOT NULL,
	"snapshotSchemaVersion" integer DEFAULT 1 NOT NULL,
	"contentHash" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"themeSnapshot" jsonb,
	"seoSnapshot" jsonb NOT NULL,
	"consentSnapshot" jsonb NOT NULL,
	"validation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"changeNote" text,
	"isRollback" boolean DEFAULT false NOT NULL,
	"createdById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PublicationVersion" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicationTarget_organizationId_kind_sourceKey_key" ON "PublicationTarget" USING btree ("organizationId", "kind", "sourceKey");
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicationTarget_organizationId_slug_key" ON "PublicationTarget" USING btree ("organizationId", "slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicationTarget_domainHost_key" ON "PublicationTarget" USING btree ("domainHost") WHERE "domainHost" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "PublicationTarget_scope_status_idx" ON "PublicationTarget" USING btree ("organizationId", "locationId", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "PublicationVersion_targetId_version_key" ON "PublicationVersion" USING btree ("targetId", "version");
--> statement-breakpoint
CREATE INDEX "PublicationVersion_targetId_createdAt_idx" ON "PublicationVersion" USING btree ("targetId", "createdAt");
--> statement-breakpoint
ALTER TABLE "PublicationTarget" ADD CONSTRAINT "PublicationTarget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationTarget" ADD CONSTRAINT "PublicationTarget_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationTarget" ADD CONSTRAINT "PublicationTarget_themePresetId_fkey" FOREIGN KEY ("themePresetId") REFERENCES "public"."GlobalStylePreset"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationTarget" ADD CONSTRAINT "PublicationTarget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationTarget" ADD CONSTRAINT "PublicationTarget_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationVersion" ADD CONSTRAINT "PublicationVersion_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."PublicationTarget"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationVersion" ADD CONSTRAINT "PublicationVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PublicationTarget" ADD CONSTRAINT "PublicationTarget_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "public"."PublicationVersion"("id") ON DELETE set null ON UPDATE cascade;
