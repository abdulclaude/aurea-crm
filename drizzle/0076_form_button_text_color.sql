ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "buttonTextColor" text DEFAULT '#ffffff' NOT NULL;

DO $$ BEGIN
 ALTER TABLE "Form" ADD CONSTRAINT "Form_buttonTextColor_check" CHECK ("buttonTextColor" ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
