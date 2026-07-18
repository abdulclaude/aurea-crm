DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "SmsConfig" LIMIT 1) THEN
		RAISE EXCEPTION 'SmsConfig contains legacy plaintext credentials; run the encrypted provider-account backfill before applying 0025';
	END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "SmsConfig_organizationId_key";
--> statement-breakpoint
ALTER TABLE "SmsConfig" ADD COLUMN "locationId" text;
--> statement-breakpoint
ALTER TABLE "SmsConfig" ADD COLUMN "providerAccountId" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "SmsConfig" DROP COLUMN "provider";
--> statement-breakpoint
ALTER TABLE "SmsConfig" DROP COLUMN "accountSid";
--> statement-breakpoint
ALTER TABLE "SmsConfig" DROP COLUMN "authToken";
--> statement-breakpoint
ALTER TABLE "SmsConfig" ADD CONSTRAINT "SmsConfig_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "SmsConfig" ADD CONSTRAINT "SmsConfig_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "public"."ProviderAccount"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "SmsConfig_scope_idx" ON "SmsConfig" USING btree ("organizationId", "locationId");
--> statement-breakpoint
CREATE UNIQUE INDEX "SmsConfig_org_default_key" ON "SmsConfig" USING btree ("organizationId") WHERE "locationId" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "SmsConfig_location_default_key" ON "SmsConfig" USING btree ("organizationId", "locationId") WHERE "locationId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "SmsConfig_providerAccountId_key" ON "SmsConfig" USING btree ("providerAccountId");
