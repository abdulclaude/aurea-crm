DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "GoogleCalendarSubscription")
    OR EXISTS (SELECT 1 FROM "GmailSubscription")
    OR EXISTS (SELECT 1 FROM "OutlookSubscription")
    OR EXISTS (SELECT 1 FROM "OneDriveSubscription") THEN
    RAISE EXCEPTION 'Provider subscriptions require explicit tenant and provider-account mapping before this migration';
  END IF;
END $$;

ALTER TABLE "GoogleCalendarSubscription" ADD COLUMN "organizationId" text NOT NULL;
ALTER TABLE "GoogleCalendarSubscription" ADD COLUMN "locationId" text;
ALTER TABLE "GoogleCalendarSubscription" ADD COLUMN "providerAccountId" text NOT NULL;
ALTER TABLE "GoogleCalendarSubscription" ADD COLUMN "webhookTokenHash" text NOT NULL;
ALTER TABLE "GoogleCalendarSubscription" ADD COLUMN "lastMessageNumber" text;
ALTER TABLE "GoogleCalendarSubscription" DROP COLUMN "webhookToken";
ALTER TABLE "GoogleCalendarSubscription" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "GmailSubscription" ADD COLUMN "organizationId" text NOT NULL;
ALTER TABLE "GmailSubscription" ADD COLUMN "locationId" text;
ALTER TABLE "GmailSubscription" ADD COLUMN "providerAccountId" text NOT NULL;
ALTER TABLE "GmailSubscription" ADD COLUMN "lastPubSubMessageId" text;
ALTER TABLE "GmailSubscription" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "OutlookSubscription" ADD COLUMN "organizationId" text NOT NULL;
ALTER TABLE "OutlookSubscription" ADD COLUMN "locationId" text;
ALTER TABLE "OutlookSubscription" ADD COLUMN "providerAccountId" text NOT NULL;
ALTER TABLE "OutlookSubscription" ADD COLUMN "clientStateHash" text NOT NULL;
ALTER TABLE "OutlookSubscription" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "OneDriveSubscription" ADD COLUMN "organizationId" text NOT NULL;
ALTER TABLE "OneDriveSubscription" ADD COLUMN "locationId" text;
ALTER TABLE "OneDriveSubscription" ADD COLUMN "providerAccountId" text NOT NULL;
ALTER TABLE "OneDriveSubscription" ADD COLUMN "clientStateHash" text NOT NULL;
ALTER TABLE "OneDriveSubscription" ALTER COLUMN "userId" DROP NOT NULL;

CREATE UNIQUE INDEX "ProviderAccount_organizationId_id_key"
ON "ProviderAccount" USING btree ("organizationId", "id");

DROP INDEX "GoogleCalendarSubscription_nodeId_key";
CREATE INDEX "GoogleCalendarSubscription_organizationId_locationId_idx"
ON "GoogleCalendarSubscription" USING btree ("organizationId", "locationId");
CREATE INDEX "GoogleCalendarSubscription_providerAccountId_idx"
ON "GoogleCalendarSubscription" USING btree ("providerAccountId");
CREATE UNIQUE INDEX "GoogleCalendarSubscription_providerAccountId_nodeId_key"
ON "GoogleCalendarSubscription" USING btree ("providerAccountId", "nodeId");

DROP INDEX "GmailSubscription_userId_key";
CREATE INDEX "GmailSubscription_organizationId_locationId_idx"
ON "GmailSubscription" USING btree ("organizationId", "locationId");
CREATE UNIQUE INDEX "GmailSubscription_providerAccountId_key"
ON "GmailSubscription" USING btree ("providerAccountId");

DROP INDEX "OutlookSubscription_userId_key";
CREATE INDEX "OutlookSubscription_organizationId_locationId_idx"
ON "OutlookSubscription" USING btree ("organizationId", "locationId");
CREATE UNIQUE INDEX "OutlookSubscription_providerAccountId_key"
ON "OutlookSubscription" USING btree ("providerAccountId");

DROP INDEX "OneDriveSubscription_userId_key";
CREATE INDEX "OneDriveSubscription_organizationId_locationId_idx"
ON "OneDriveSubscription" USING btree ("organizationId", "locationId");
CREATE UNIQUE INDEX "OneDriveSubscription_providerAccountId_key"
ON "OneDriveSubscription" USING btree ("providerAccountId");

ALTER TABLE "GoogleCalendarSubscription" DROP CONSTRAINT "GoogleCalendarSubscription_userId_fkey";
ALTER TABLE "GoogleCalendarSubscription"
ADD CONSTRAINT "GoogleCalendarSubscription_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "GoogleCalendarSubscription"
ADD CONSTRAINT "GoogleCalendarSubscription_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "GoogleCalendarSubscription"
ADD CONSTRAINT "GoogleCalendarSubscription_providerAccountId_fkey"
FOREIGN KEY ("organizationId", "providerAccountId")
REFERENCES "public"."ProviderAccount"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "GoogleCalendarSubscription"
ADD CONSTRAINT "GoogleCalendarSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "GmailSubscription" DROP CONSTRAINT "GmailSubscription_userId_fkey";
ALTER TABLE "GmailSubscription"
ADD CONSTRAINT "GmailSubscription_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "GmailSubscription"
ADD CONSTRAINT "GmailSubscription_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "GmailSubscription"
ADD CONSTRAINT "GmailSubscription_providerAccountId_fkey"
FOREIGN KEY ("organizationId", "providerAccountId")
REFERENCES "public"."ProviderAccount"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "GmailSubscription"
ADD CONSTRAINT "GmailSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "OutlookSubscription" DROP CONSTRAINT "OutlookSubscription_userId_fkey";
ALTER TABLE "OutlookSubscription"
ADD CONSTRAINT "OutlookSubscription_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "OutlookSubscription"
ADD CONSTRAINT "OutlookSubscription_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "OutlookSubscription"
ADD CONSTRAINT "OutlookSubscription_providerAccountId_fkey"
FOREIGN KEY ("organizationId", "providerAccountId")
REFERENCES "public"."ProviderAccount"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "OutlookSubscription"
ADD CONSTRAINT "OutlookSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "OneDriveSubscription" DROP CONSTRAINT "OneDriveSubscription_userId_fkey";
ALTER TABLE "OneDriveSubscription"
ADD CONSTRAINT "OneDriveSubscription_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "OneDriveSubscription"
ADD CONSTRAINT "OneDriveSubscription_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "OneDriveSubscription"
ADD CONSTRAINT "OneDriveSubscription_providerAccountId_fkey"
FOREIGN KEY ("organizationId", "providerAccountId")
REFERENCES "public"."ProviderAccount"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "OneDriveSubscription"
ADD CONSTRAINT "OneDriveSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE set null ON UPDATE cascade;
