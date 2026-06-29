DO $$ BEGIN
 CREATE TYPE "public"."PricingAccessTargetType" AS ENUM('ALL_SERVICES', 'SERVICE_TYPE', 'SERVICE_CATEGORY', 'CLASS_TYPE', 'VIDEO_LIBRARY', 'COMMUNITY', 'RETAIL_PRODUCT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."PricingOptionType" AS ENUM('CLASS_PACK', 'MEMBERSHIP', 'BUNDLE', 'DROP_IN', 'INTRO_OFFER', 'ACCOUNT_CREDIT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "PricingOption" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"membershipPlanId" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"type" "PricingOptionType" DEFAULT 'MEMBERSHIP' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"billingInterval" "BillingInterval" DEFAULT 'ONE_TIME' NOT NULL,
	"classCredits" integer,
	"durationDays" integer,
	"revenueCategory" text,
	"isIntroOffer" boolean DEFAULT false NOT NULL,
	"isBundle" boolean DEFAULT false NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"isHidden" boolean DEFAULT false NOT NULL,
	"showInPos" boolean DEFAULT true NOT NULL,
	"directPurchaseEnabled" boolean DEFAULT true NOT NULL,
	"buyPagePath" text,
	"termsText" text,
	"confirmationEmailBody" text,
	"confirmationRedirectUrl" text,
	"commissionMode" text DEFAULT 'NONE' NOT NULL,
	"commissionValue" numeric(10, 2),
	"maxPurchases" integer,
	"maxPurchasesPerClient" integer,
	"bookingLimits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"accessSummary" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PricingOption" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "PricingOptionAccessGrant" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"pricingOptionId" text NOT NULL,
	"targetType" "PricingAccessTargetType" DEFAULT 'ALL_SERVICES' NOT NULL,
	"serviceTypeId" text,
	"serviceCategoryId" text,
	"classTypeId" text,
	"productId" text,
	"targetKey" text,
	"visitLimit" integer,
	"bookingLimitPerDay" integer,
	"bookingLimitPerWeek" integer,
	"bookingLimitPerMonth" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "PricingOption_billingInterval_idx" ON "PricingOption" USING btree ("billingInterval" enum_ops);
--> statement-breakpoint
CREATE INDEX "PricingOption_isActive_idx" ON "PricingOption" USING btree ("isActive" bool_ops);
--> statement-breakpoint
CREATE INDEX "PricingOption_locationId_idx" ON "PricingOption" USING btree ("locationId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOption_membershipPlanId_idx" ON "PricingOption" USING btree ("membershipPlanId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOption_organizationId_idx" ON "PricingOption" USING btree ("organizationId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOption_showInPos_idx" ON "PricingOption" USING btree ("showInPos" bool_ops);
--> statement-breakpoint
CREATE INDEX "PricingOption_type_idx" ON "PricingOption" USING btree ("type" enum_ops);
--> statement-breakpoint
CREATE UNIQUE INDEX "PricingOption_organizationId_slug_key" ON "PricingOption" USING btree ("organizationId" text_ops,"slug" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_classTypeId_idx" ON "PricingOptionAccessGrant" USING btree ("classTypeId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_locationId_idx" ON "PricingOptionAccessGrant" USING btree ("locationId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_organizationId_idx" ON "PricingOptionAccessGrant" USING btree ("organizationId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_pricingOptionId_idx" ON "PricingOptionAccessGrant" USING btree ("pricingOptionId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_productId_idx" ON "PricingOptionAccessGrant" USING btree ("productId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_serviceCategoryId_idx" ON "PricingOptionAccessGrant" USING btree ("serviceCategoryId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_serviceTypeId_idx" ON "PricingOptionAccessGrant" USING btree ("serviceTypeId" text_ops);
--> statement-breakpoint
CREATE INDEX "PricingOptionAccessGrant_targetType_idx" ON "PricingOptionAccessGrant" USING btree ("targetType" enum_ops);
--> statement-breakpoint
ALTER TABLE "PricingOption" ADD CONSTRAINT "PricingOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOption" ADD CONSTRAINT "PricingOption_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOption" ADD CONSTRAINT "PricingOption_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "public"."MembershipPlan"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ADD CONSTRAINT "PricingOptionAccessGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ADD CONSTRAINT "PricingOptionAccessGrant_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ADD CONSTRAINT "PricingOptionAccessGrant_pricingOptionId_fkey" FOREIGN KEY ("pricingOptionId") REFERENCES "public"."PricingOption"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ADD CONSTRAINT "PricingOptionAccessGrant_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "public"."ServiceType"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ADD CONSTRAINT "PricingOptionAccessGrant_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "public"."ServiceCategory"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ADD CONSTRAINT "PricingOptionAccessGrant_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "public"."ClassType"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "PricingOptionAccessGrant" ADD CONSTRAINT "PricingOptionAccessGrant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."StudioProduct"("id") ON DELETE set null ON UPDATE cascade;
