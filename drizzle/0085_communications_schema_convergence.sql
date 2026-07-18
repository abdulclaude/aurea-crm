ALTER TABLE "TwilioPhoneNumber"
  ADD COLUMN IF NOT EXISTS "complianceRegistrationId" text,
  ADD COLUMN IF NOT EXISTS "messagingServiceSid" text;
--> statement-breakpoint
ALTER TABLE "VoiceCall"
  ADD COLUMN IF NOT EXISTS "providerCostCurrency" varchar(3),
  ADD COLUMN IF NOT EXISTS "providerCostReconciledAt" timestamp(3);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CommunicationAuditEvent" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "actorUserId" text,
  "action" text NOT NULL,
  "resourceType" text NOT NULL,
  "resourceId" text,
  "safeMetadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "CommunicationAuditEvent_scope_createdAt_idx"
  ON "CommunicationAuditEvent" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "TwilioComplianceRegistration_organizationId_id_key"
  ON "TwilioComplianceRegistration" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "TwilioPhoneNumber_org_provider_id_key"
  ON "TwilioPhoneNumber" USING btree ("organizationId", "providerAccountId", "id");
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_organizationId_deliveryId_fkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "OutboundDelivery_organizationId_id_key";
--> statement-breakpoint
CREATE UNIQUE INDEX "OutboundDelivery_organizationId_id_key"
  ON "OutboundDelivery" USING btree ("organizationId", "id");
--> statement-breakpoint
ALTER TABLE "VoiceCall" DROP CONSTRAINT IF EXISTS "VoiceCall_provider_cost_currency_check";
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_provider_cost_currency_check"
  CHECK ("providerCostCurrency" IS NULL OR "providerCostCurrency" ~ '^[A-Z]{3}$');
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" DROP CONSTRAINT IF EXISTS "CommunicationAuditEvent_organizationId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" ADD CONSTRAINT "CommunicationAuditEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" DROP CONSTRAINT IF EXISTS "CommunicationAuditEvent_organizationId_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" ADD CONSTRAINT "CommunicationAuditEvent_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" DROP CONSTRAINT IF EXISTS "CommunicationAuditEvent_actorUserId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" ADD CONSTRAINT "CommunicationAuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" DROP CONSTRAINT IF EXISTS "TwilioPhoneNumber_organizationId_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" ADD CONSTRAINT "TwilioPhoneNumber_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" DROP CONSTRAINT IF EXISTS "TwilioPhoneNumber_organizationId_complianceRegistrationId_fkey";
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" ADD CONSTRAINT "TwilioPhoneNumber_organizationId_complianceRegistrationId_fkey"
  FOREIGN KEY ("organizationId", "complianceRegistrationId") REFERENCES "public"."TwilioComplianceRegistration"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "VoiceCall" DROP CONSTRAINT IF EXISTS "VoiceCall_organizationId_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "VoiceCall" DROP CONSTRAINT IF EXISTS "VoiceCall_organizationId_clientId_fkey";
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_organizationId_clientId_fkey"
  FOREIGN KEY ("organizationId", "clientId") REFERENCES "public"."Client"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "VoiceCall" DROP CONSTRAINT IF EXISTS "VoiceCall_organizationId_phoneNumberId_fkey";
--> statement-breakpoint
ALTER TABLE "VoiceCall" DROP CONSTRAINT IF EXISTS "VoiceCall_org_provider_phoneNumberId_fkey";
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_org_provider_phoneNumberId_fkey"
  FOREIGN KEY ("organizationId", "providerAccountId", "phoneNumberId") REFERENCES "public"."TwilioPhoneNumber"("organizationId", "providerAccountId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" DROP CONSTRAINT IF EXISTS "CommunicationProvisioningOperation_organizationId_providerAccountId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_providerAccountId_fkey"
  FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" DROP CONSTRAINT IF EXISTS "CommunicationProvisioningOperation_organizationId_emailDomainId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_emailDomainId_fkey"
  FOREIGN KEY ("organizationId", "emailDomainId") REFERENCES "public"."EmailDomain"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" DROP CONSTRAINT IF EXISTS "CommunicationProvisioningOperation_organizationId_phoneNumberId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_phoneNumberId_fkey"
  FOREIGN KEY ("organizationId", "phoneNumberId") REFERENCES "public"."TwilioPhoneNumber"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_organizationId_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_organizationId_clientId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_clientId_fkey"
  FOREIGN KEY ("organizationId", "clientId") REFERENCES "public"."Client"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_organizationId_providerAccountId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_providerAccountId_fkey"
  FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_organizationId_phoneNumberId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_org_provider_phoneNumberId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_org_provider_phoneNumberId_fkey"
  FOREIGN KEY ("organizationId", "providerAccountId", "phoneNumberId") REFERENCES "public"."TwilioPhoneNumber"("organizationId", "providerAccountId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_deliveryId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_organizationId_deliveryId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_deliveryId_fkey"
  FOREIGN KEY ("organizationId", "deliveryId") REFERENCES "public"."OutboundDelivery"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" DROP CONSTRAINT IF EXISTS "CommunicationUsageLedger_organizationId_voiceCallId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_voiceCallId_fkey"
  FOREIGN KEY ("organizationId", "voiceCallId") REFERENCES "public"."VoiceCall"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" DROP CONSTRAINT IF EXISTS "CommunicationWebhookReceipt_organizationId_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" ADD CONSTRAINT "CommunicationWebhookReceipt_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" DROP CONSTRAINT IF EXISTS "CommunicationWebhookReceipt_organizationId_providerAccountId_fkey";
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" ADD CONSTRAINT "CommunicationWebhookReceipt_organizationId_providerAccountId_fkey"
  FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
