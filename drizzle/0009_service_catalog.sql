DO $$ BEGIN
 CREATE TYPE "public"."ServiceExperienceType" AS ENUM('CLASS', 'PRIVATE', 'EVENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ServiceFormat" AS ENUM('IN_PERSON', 'VIRTUAL', 'HYBRID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ServicePaymentType" AS ENUM('FREE', 'PAID', 'SLIDING_SCALE', 'PACKAGE_ONLY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ServiceVisibility" AS ENUM('PUBLIC', 'PRIVATE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "ServiceCategory" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ServiceCategory" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "ServiceType" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"categoryId" text,
	"classTypeId" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"experienceType" "ServiceExperienceType" DEFAULT 'CLASS' NOT NULL,
	"format" "ServiceFormat" DEFAULT 'IN_PERSON' NOT NULL,
	"defaultLocation" text,
	"durationMinutes" integer DEFAULT 60 NOT NULL,
	"capacity" integer,
	"bufferMinutes" integer DEFAULT 0 NOT NULL,
	"roomIds" text[] DEFAULT ARRAY[]::text[],
	"instructorIds" text[] DEFAULT ARRAY[]::text[],
	"paymentType" "ServicePaymentType" DEFAULT 'PACKAGE_ONLY' NOT NULL,
	"visibility" "ServiceVisibility" DEFAULT 'PUBLIC' NOT NULL,
	"price" numeric(10, 2),
	"slidingScaleMinPrice" numeric(10, 2),
	"slidingScaleMaxPrice" numeric(10, 2),
	"currency" text DEFAULT 'GBP' NOT NULL,
	"revenueCategory" text,
	"bookingRestrictionTags" text[] DEFAULT ARRAY[]::text[],
	"workoutTypes" text[] DEFAULT ARRAY[]::text[],
	"areasOfFocus" text[] DEFAULT ARRAY[]::text[],
	"intensity" text,
	"equipment" text[] DEFAULT ARRAY[]::text[],
	"checkoutConfirmation" text,
	"confirmationEmailBody" text,
	"imageUrl" text,
	"allowUnpaidBookings" boolean DEFAULT false NOT NULL,
	"delaySchedulingHours" integer,
	"allowRecurringBookings" boolean DEFAULT false NOT NULL,
	"displayImageAtCheckout" boolean DEFAULT true NOT NULL,
	"calendarColor" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ServiceType" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "ClassSeries" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"serviceTypeId" text,
	"classTypeId" text,
	"roomId" text,
	"name" text NOT NULL,
	"description" text,
	"startDate" date NOT NULL,
	"endDate" date,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"recurrenceRule" text NOT NULL,
	"recurrenceDays" text[] DEFAULT ARRAY[]::text[],
	"instructorIds" text[] DEFAULT ARRAY[]::text[],
	"capacity" integer,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ClassSeries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "serviceTypeId" text;
--> statement-breakpoint
CREATE INDEX "ServiceCategory_isActive_idx" ON "ServiceCategory" USING btree ("isActive" bool_ops);
--> statement-breakpoint
CREATE INDEX "ServiceCategory_locationId_idx" ON "ServiceCategory" USING btree ("locationId" text_ops);
--> statement-breakpoint
CREATE INDEX "ServiceCategory_organizationId_idx" ON "ServiceCategory" USING btree ("organizationId" text_ops);
--> statement-breakpoint
CREATE UNIQUE INDEX "ServiceCategory_organizationId_slug_key" ON "ServiceCategory" USING btree ("organizationId" text_ops,"slug" text_ops);
--> statement-breakpoint
CREATE INDEX "ServiceType_categoryId_idx" ON "ServiceType" USING btree ("categoryId" text_ops);
--> statement-breakpoint
CREATE INDEX "ServiceType_classTypeId_idx" ON "ServiceType" USING btree ("classTypeId" text_ops);
--> statement-breakpoint
CREATE INDEX "ServiceType_experienceType_idx" ON "ServiceType" USING btree ("experienceType" enum_ops);
--> statement-breakpoint
CREATE INDEX "ServiceType_isActive_idx" ON "ServiceType" USING btree ("isActive" bool_ops);
--> statement-breakpoint
CREATE INDEX "ServiceType_locationId_idx" ON "ServiceType" USING btree ("locationId" text_ops);
--> statement-breakpoint
CREATE INDEX "ServiceType_organizationId_idx" ON "ServiceType" USING btree ("organizationId" text_ops);
--> statement-breakpoint
CREATE UNIQUE INDEX "ServiceType_organizationId_slug_key" ON "ServiceType" USING btree ("organizationId" text_ops,"slug" text_ops);
--> statement-breakpoint
CREATE INDEX "ClassSeries_classTypeId_idx" ON "ClassSeries" USING btree ("classTypeId" text_ops);
--> statement-breakpoint
CREATE INDEX "ClassSeries_locationId_idx" ON "ClassSeries" USING btree ("locationId" text_ops);
--> statement-breakpoint
CREATE INDEX "ClassSeries_organizationId_idx" ON "ClassSeries" USING btree ("organizationId" text_ops);
--> statement-breakpoint
CREATE INDEX "ClassSeries_serviceTypeId_idx" ON "ClassSeries" USING btree ("serviceTypeId" text_ops);
--> statement-breakpoint
CREATE INDEX "ClassSeries_status_idx" ON "ClassSeries" USING btree ("status" text_ops);
--> statement-breakpoint
CREATE INDEX "StudioClass_serviceTypeId_idx" ON "StudioClass" USING btree ("serviceTypeId" text_ops);
--> statement-breakpoint
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ServiceCategory"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ClassSeries" ADD CONSTRAINT "ClassSeries_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE set null ON UPDATE cascade;
