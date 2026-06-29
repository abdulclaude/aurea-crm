CREATE TYPE "public"."ClassPricingModel" AS ENUM('FREE', 'DROP_IN', 'PACKAGE_ONLY', 'SLIDING_SCALE');--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "cancellationPolicyId" text;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "currency" text DEFAULT 'GBP' NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "dropInPrice" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "imageUrl" text;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "onlineBookingEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "onlineCapacity" integer;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "pricingModel" "ClassPricingModel" DEFAULT 'PACKAGE_ONLY' NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "slidingScaleMaxPrice" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "slidingScaleMinPrice" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "spotPickingEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "waitlistEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "autoPromoteWaitlist" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "StudioClass" ADD COLUMN "walkInCapacity" integer;--> statement-breakpoint
CREATE INDEX "StudioClass_cancellationPolicyId_idx" ON "StudioClass" USING btree ("cancellationPolicyId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_onlineBookingEnabled_idx" ON "StudioClass" USING btree ("onlineBookingEnabled" bool_ops);--> statement-breakpoint
CREATE INDEX "StudioClass_pricingModel_idx" ON "StudioClass" USING btree ("pricingModel" enum_ops);