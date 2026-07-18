ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "progressDisplay" text DEFAULT 'BAR' NOT NULL;

DO $$ BEGIN
 ALTER TABLE "Form" ADD CONSTRAINT "Form_progressDisplay_check" CHECK ("progressDisplay" IN ('RING', 'STEPS', 'BAR'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
