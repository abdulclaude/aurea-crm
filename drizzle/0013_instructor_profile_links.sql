ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "bio" text;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "instructorCertifications" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "instructorClassTypes" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "instructorSpecialties" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "publicProfileSlug" text;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "stripeAccountId" text;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "stripeAccountStatus" text;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN IF NOT EXISTS "userId" text;--> statement-breakpoint
ALTER TABLE "Instructor" ALTER COLUMN "languages" SET DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "Instructor" ALTER COLUMN "preferredShiftTypes" SET DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "Instructor" ALTER COLUMN "qualifications" SET DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "Instructor" ALTER COLUMN "skills" SET DEFAULT ARRAY[]::text[];--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Instructor_userId_idx" ON "Instructor" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Instructor_userId_key" ON "Instructor" USING btree ("userId" text_ops);
