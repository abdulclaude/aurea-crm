DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Credential")
    OR EXISTS (SELECT 1 FROM "Webhook")
    OR EXISTS (SELECT 1 FROM "Apps") THEN
    RAISE EXCEPTION 'Legacy provider records require explicit tenant mapping before this migration';
  END IF;
END $$;

ALTER TABLE "Credential" ADD COLUMN "organizationId" text NOT NULL;
ALTER TABLE "Webhook" ADD COLUMN "organizationId" text NOT NULL;
ALTER TABLE "Apps" ADD COLUMN "organizationId" text NOT NULL;
ALTER TABLE "Apps" ADD COLUMN "locationId" text;

CREATE INDEX "Credential_organizationId_idx"
ON "Credential" USING btree ("organizationId");
CREATE INDEX "Webhook_organizationId_idx"
ON "Webhook" USING btree ("organizationId");
CREATE INDEX "Apps_organizationId_idx"
ON "Apps" USING btree ("organizationId");
CREATE INDEX "Apps_locationId_idx"
ON "Apps" USING btree ("locationId");

DROP INDEX "Apps_userId_provider_key";
CREATE UNIQUE INDEX "Apps_org_provider_key"
ON "Apps" USING btree ("organizationId", "provider")
WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "Apps_location_provider_key"
ON "Apps" USING btree ("organizationId", "locationId", "provider")
WHERE "locationId" IS NOT NULL;

ALTER TABLE "Credential"
ADD CONSTRAINT "Credential_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Credential"
ADD CONSTRAINT "Credential_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON UPDATE cascade;

ALTER TABLE "Webhook"
ADD CONSTRAINT "Webhook_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Webhook"
ADD CONSTRAINT "Webhook_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON UPDATE cascade;

ALTER TABLE "Apps"
ADD CONSTRAINT "Apps_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Apps"
ADD CONSTRAINT "Apps_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON UPDATE cascade;
