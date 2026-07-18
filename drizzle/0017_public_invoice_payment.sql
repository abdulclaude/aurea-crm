DO $$ BEGIN
 CREATE TYPE "public"."InvoiceAccessPurpose" AS ENUM('PAY', 'VIEW');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "InvoiceAccessToken" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"purpose" "InvoiceAccessPurpose" NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"revokedAt" timestamp(3),
	"createdBy" text,
	"revokedBy" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "InvoiceAccessToken_tokenHash_key" UNIQUE("tokenHash")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InvoiceAccessToken" ADD CONSTRAINT "InvoiceAccessToken_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InvoiceAccessToken" ADD CONSTRAINT "InvoiceAccessToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InvoiceAccessToken" ADD CONSTRAINT "InvoiceAccessToken_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InvoiceAccessToken" ADD CONSTRAINT "InvoiceAccessToken_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InvoiceAccessToken" ADD CONSTRAINT "InvoiceAccessToken_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceAccessToken_tokenHash_key" ON "InvoiceAccessToken" USING btree ("tokenHash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "InvoiceAccessToken_invoiceId_purpose_idx" ON "InvoiceAccessToken" USING btree ("invoiceId", "purpose");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "InvoiceAccessToken_scope_idx" ON "InvoiceAccessToken" USING btree ("organizationId", "locationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "InvoiceAccessToken_expiresAt_idx" ON "InvoiceAccessToken" USING btree ("expiresAt");
--> statement-breakpoint
ALTER TABLE "InvoiceAccessToken" ENABLE ROW LEVEL SECURITY;
