ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "primaryColor" text DEFAULT '#2563eb' NOT NULL;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "backgroundColor" text DEFAULT '#ffffff' NOT NULL;
ALTER TABLE "Form" ADD COLUMN IF NOT EXISTS "textColor" text DEFAULT '#111827' NOT NULL;

DO $$ BEGIN
 ALTER TABLE "Form" ADD CONSTRAINT "Form_primaryColor_check" CHECK ("primaryColor" ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Form" ADD CONSTRAINT "Form_backgroundColor_check" CHECK ("backgroundColor" ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Form" ADD CONSTRAINT "Form_textColor_check" CHECK ("textColor" ~ '^#[0-9A-Fa-f]{6}$');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
