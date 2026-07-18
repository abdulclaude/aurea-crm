CREATE UNIQUE INDEX "Location_organizationId_id_key" ON "Location" USING btree ("organizationId", "id");
--> statement-breakpoint
ALTER TABLE "ProviderAccount" DROP CONSTRAINT "ProviderAccount_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "ProviderAccount" ADD CONSTRAINT "ProviderAccount_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "SmsConfig" DROP CONSTRAINT "SmsConfig_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "SmsConfig" ADD CONSTRAINT "SmsConfig_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
