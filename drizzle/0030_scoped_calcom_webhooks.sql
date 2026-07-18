CREATE TYPE "public"."CalComWebhookReceiptStatus" AS ENUM('PROCESSED', 'IGNORED');

ALTER TABLE "CalComCredential" ADD COLUMN "webhookId" text;
ALTER TABLE "CalComCredential" ADD COLUMN "webhookSecret" text;
ALTER TABLE "CalComCredential" ADD COLUMN "webhookConfiguredAt" timestamp(3);
ALTER TABLE "CalComCredential" ADD COLUMN "lastWebhookAt" timestamp(3);
ALTER TABLE "CalComCredential" ADD COLUMN "lastWebhookError" text;
ALTER TABLE "CalComCredential" ALTER COLUMN "apiKey" DROP NOT NULL;

ALTER TABLE "Booking" ADD COLUMN "calComCredentialId" text;
ALTER TABLE "Booking" ADD COLUMN "calLastEventAt" timestamp(3);
ALTER TABLE "BookingEventType" ADD COLUMN "calComCredentialId" text;

DROP INDEX "Booking_calBookingUid_key";
CREATE UNIQUE INDEX "Booking_calComCredentialId_calBookingUid_key"
ON "Booking" USING btree ("calComCredentialId", "calBookingUid")
WHERE "calComCredentialId" IS NOT NULL AND "calBookingUid" IS NOT NULL;
CREATE INDEX "Booking_calComCredentialId_idx"
ON "Booking" USING btree ("calComCredentialId");
CREATE INDEX "BookingEventType_calComCredentialId_idx"
ON "BookingEventType" USING btree ("calComCredentialId");
CREATE UNIQUE INDEX "BookingEventType_calComCredentialId_calEventTypeId_key"
ON "BookingEventType" USING btree ("calComCredentialId", "calEventTypeId")
WHERE "calComCredentialId" IS NOT NULL AND "calEventTypeId" IS NOT NULL;

DROP INDEX "CalComCredential_locationId_key";
CREATE UNIQUE INDEX "CalComCredential_org_key"
ON "CalComCredential" USING btree ("organizationId")
WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "CalComCredential_org_location_key"
ON "CalComCredential" USING btree ("organizationId", "locationId")
WHERE "locationId" IS NOT NULL;

ALTER TABLE "CalComCredential"
ADD CONSTRAINT "CalComCredential_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_calComCredentialId_fkey"
FOREIGN KEY ("calComCredentialId") REFERENCES "public"."CalComCredential"("id")
ON DELETE set null ON UPDATE cascade;
ALTER TABLE "BookingEventType"
ADD CONSTRAINT "BookingEventType_calComCredentialId_fkey"
FOREIGN KEY ("calComCredentialId") REFERENCES "public"."CalComCredential"("id")
ON DELETE set null ON UPDATE cascade;

CREATE TABLE "CalComWebhookReceipt" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text NOT NULL,
  "credentialId" text NOT NULL,
  "eventKey" text NOT NULL,
  "triggerEvent" text NOT NULL,
  "bookingUid" text,
  "bookingId" text,
  "providerCreatedAt" timestamp(3),
  "status" "CalComWebhookReceiptStatus" NOT NULL,
  "outcome" text NOT NULL,
  "workflowDispatchedAt" timestamp(3),
  "workflowDispatchError" text,
  "receivedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "processedAt" timestamp(3) NOT NULL
);

ALTER TABLE "CalComWebhookReceipt" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX "CalComWebhookReceipt_credentialId_eventKey_key"
ON "CalComWebhookReceipt" USING btree ("credentialId", "eventKey");
CREATE INDEX "CalComWebhookReceipt_organizationId_locationId_receivedAt_idx"
ON "CalComWebhookReceipt" USING btree ("organizationId", "locationId", "receivedAt" DESC);
CREATE INDEX "CalComWebhookReceipt_status_receivedAt_idx"
ON "CalComWebhookReceipt" USING btree ("status", "receivedAt" DESC);

ALTER TABLE "CalComWebhookReceipt"
ADD CONSTRAINT "CalComWebhookReceipt_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id")
ON DELETE set null ON UPDATE cascade;
ALTER TABLE "CalComWebhookReceipt"
ADD CONSTRAINT "CalComWebhookReceipt_credentialId_fkey"
FOREIGN KEY ("credentialId") REFERENCES "public"."CalComCredential"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "CalComWebhookReceipt"
ADD CONSTRAINT "CalComWebhookReceipt_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "CalComWebhookReceipt"
ADD CONSTRAINT "CalComWebhookReceipt_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;
