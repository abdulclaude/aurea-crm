DO $$ BEGIN
 CREATE TYPE "public"."StudioType" AS ENUM('YOGA', 'PILATES', 'GYM', 'CROSSFIT', 'BARRE', 'DANCE', 'MARTIAL_ARTS', 'SPIN', 'SWIM', 'MULTI_DISCIPLINE', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "studioType" "StudioType";
