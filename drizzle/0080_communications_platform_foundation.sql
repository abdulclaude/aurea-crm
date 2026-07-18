ALTER TYPE "public"."DeliveryChannel" ADD VALUE IF NOT EXISTS 'VOICE' BEFORE 'APP';
--> statement-breakpoint
CREATE TYPE "public"."CommunicationChannelState" AS ENUM('NOT_REQUESTED', 'AWAITING_CUSTOMER_INFORMATION', 'AWAITING_COMPLIANCE', 'AWAITING_DNS', 'PROVISIONING', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'FAILED', 'CANCELLATION_GRACE_PERIOD', 'RELEASE_SCHEDULED', 'RELEASED');
--> statement-breakpoint
CREATE TYPE "public"."CommunicationProvisioningOperationType" AS ENUM('CREATE', 'VERIFY', 'REFRESH', 'CONFIGURE', 'PURCHASE', 'SUSPEND', 'RELEASE', 'RECONCILE');
--> statement-breakpoint
CREATE TYPE "public"."CommunicationProvisioningService" AS ENUM('RESEND_DOMAIN', 'TWILIO_SUBACCOUNT', 'TWILIO_PHONE_NUMBER', 'TWILIO_PHONE_WEBHOOKS', 'TWILIO_PHONE_RELEASE', 'TWILIO_COMPLIANCE');
--> statement-breakpoint
CREATE TYPE "public"."CommunicationProvisioningStatus" AS ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'RETRYABLE_FAILURE', 'FAILED', 'AMBIGUOUS', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "public"."CommunicationUsageEntryKind" AS ENUM('RESERVATION', 'USAGE', 'RELEASE', 'ADJUSTMENT');
--> statement-breakpoint
CREATE TYPE "public"."CommunicationUsageResourceType" AS ENUM('EMAIL', 'SMS_SEGMENT', 'VOICE_SECOND', 'PHONE_NUMBER');
--> statement-breakpoint
CREATE TYPE "public"."ProviderOwnershipMode" AS ENUM('PLATFORM_MANAGED', 'TENANT_MANAGED_LEGACY');
--> statement-breakpoint
CREATE TYPE "public"."TwilioPhoneNumberStatus" AS ENUM('PENDING', 'PROVISIONING', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'RELEASE_SCHEDULED', 'RELEASING', 'RELEASED', 'FAILED');
--> statement-breakpoint
CREATE TYPE "public"."VoiceCallDirection" AS ENUM('INBOUND', 'OUTBOUND');
--> statement-breakpoint
CREATE TYPE "public"."VoiceCallStatus" AS ENUM('QUEUED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'BUSY', 'NO_ANSWER', 'CANCELED', 'FAILED');
--> statement-breakpoint
ALTER TABLE "ProviderAccount" ADD COLUMN "ownershipMode" "ProviderOwnershipMode" DEFAULT 'TENANT_MANAGED_LEGACY' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ProviderAccount_org_twilio_platform_key" ON "ProviderAccount" USING btree ("organizationId", "provider", "environment") WHERE "locationId" IS NULL AND "provider" = 'TWILIO' AND "ownershipMode" = 'PLATFORM_MANAGED';
--> statement-breakpoint
CREATE UNIQUE INDEX "ProviderAccount_org_resend_platform_key" ON "ProviderAccount" USING btree ("organizationId", "provider", "environment") WHERE "locationId" IS NULL AND "provider" = 'RESEND' AND "ownershipMode" = 'PLATFORM_MANAGED';
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ProviderAccount"
    WHERE "provider" = 'TWILIO'
      AND "ownershipMode" = 'PLATFORM_MANAGED'
      AND "externalAccountId" IS NOT NULL
    GROUP BY "externalAccountId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ProviderAccount contains duplicate managed Twilio account SIDs; reconcile them before applying 0080';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "ProviderAccount_twilio_platform_external_account_key" ON "ProviderAccount" USING btree ("externalAccountId") WHERE "provider" = 'TWILIO' AND "ownershipMode" = 'PLATFORM_MANAGED' AND "externalAccountId" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "ownershipMode" "ProviderOwnershipMode" DEFAULT 'TENANT_MANAGED_LEGACY' NOT NULL;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "lifecycleState" "CommunicationChannelState" DEFAULT 'AWAITING_DNS' NOT NULL;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "isDefault" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "isDisabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "verificationStaleAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "removedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "lastErrorCode" text;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "lastErrorMessage" text;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "EmailDomain"
    GROUP BY lower("domain")
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'EmailDomain contains case-insensitive duplicates; resolve them before applying 0080';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "EmailDomain" ed
    JOIN "ProviderAccount" pa ON pa."id" = ed."providerAccountId"
    WHERE ed."organizationId" <> pa."organizationId"
  ) THEN
    RAISE EXCEPTION 'EmailDomain contains cross-organization provider bindings; reconcile them before applying 0080';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "EmailDomain" ed
    JOIN "Location" l ON l."id" = ed."locationId"
    WHERE ed."organizationId" <> l."organizationId"
  ) THEN
    RAISE EXCEPTION 'EmailDomain contains cross-organization location bindings; reconcile them before applying 0080';
  END IF;
END $$;
--> statement-breakpoint
UPDATE "EmailDomain"
SET "lifecycleState" = CASE
  WHEN "status" = 'VERIFIED' THEN 'ACTIVE'::"CommunicationChannelState"
  WHEN "status" = 'FAILED' THEN 'FAILED'::"CommunicationChannelState"
  ELSE 'AWAITING_DNS'::"CommunicationChannelState"
END;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "organizationId", "locationId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS position
  FROM "EmailDomain"
  WHERE "status" = 'VERIFIED'
)
UPDATE "EmailDomain" ed
SET "isDefault" = true
FROM ranked
WHERE ranked."id" = ed."id" AND ranked.position = 1;
--> statement-breakpoint
DROP INDEX IF EXISTS "EmailDomain_domain_key";
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailDomain_domain_key" ON "EmailDomain" (lower("domain"));
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailDomain_resendDomainId_key" ON "EmailDomain" USING btree ("resendDomainId") WHERE "resendDomainId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailDomain_organization_default_key" ON "EmailDomain" USING btree ("organizationId") WHERE "locationId" IS NULL AND "isDefault" = true AND "isDisabled" = false AND "removedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailDomain_location_default_key" ON "EmailDomain" USING btree ("organizationId", "locationId") WHERE "locationId" IS NOT NULL AND "isDefault" = true AND "isDisabled" = false AND "removedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailDomain_organizationId_id_key" ON "EmailDomain" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "EmailTemplate_organizationId_id_key" ON "EmailTemplate" USING btree ("organizationId", "id");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Campaign" campaign
    JOIN "EmailDomain" domain ON domain."id" = campaign."emailDomainId"
    WHERE campaign."organizationId" <> domain."organizationId"
       OR domain."locationId" IS DISTINCT FROM campaign."locationId"
  ) THEN
    RAISE EXCEPTION 'Campaign contains cross-organization email-domain bindings; reconcile them before applying 0080';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Campaign" campaign
    JOIN "Location" scoped_location ON scoped_location."id" = campaign."locationId"
    WHERE campaign."organizationId" <> scoped_location."organizationId"
  ) THEN
    RAISE EXCEPTION 'Campaign contains cross-organization location bindings; reconcile them before applying 0080';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Campaign" campaign
    JOIN "EmailTemplate" template ON template."id" = campaign."templateId"
    WHERE campaign."organizationId" <> template."organizationId"
       OR template."locationId" IS DISTINCT FROM campaign."locationId"
  ) THEN
    RAISE EXCEPTION 'Campaign contains cross-organization template bindings; reconcile them before applying 0080';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_emailDomainId_fkey";
--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_emailDomainId_fkey" FOREIGN KEY ("organizationId", "emailDomainId") REFERENCES "public"."EmailDomain"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_templateId_fkey";
--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_templateId_fkey" FOREIGN KEY ("organizationId", "templateId") REFERENCES "public"."EmailTemplate"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "enforce_campaign_communication_scope"() RETURNS trigger AS $$
BEGIN
  IF NEW."emailDomainId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "EmailDomain" domain
    WHERE domain."id" = NEW."emailDomainId"
      AND domain."organizationId" = NEW."organizationId"
      AND domain."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Campaign email domain must belong to the exact campaign scope';
  END IF;
  IF NEW."templateId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "EmailTemplate" template
    WHERE template."id" = NEW."templateId"
      AND template."organizationId" = NEW."organizationId"
      AND template."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Campaign email template must belong to the exact campaign scope';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "Campaign_communication_scope_trigger" ON "Campaign";
--> statement-breakpoint
CREATE TRIGGER "Campaign_communication_scope_trigger"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "emailDomainId", "templateId" ON "Campaign"
FOR EACH ROW EXECUTE FUNCTION "enforce_campaign_communication_scope"();
--> statement-breakpoint
ALTER TABLE "EmailTemplate" DROP CONSTRAINT IF EXISTS "EmailTemplate_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "EmailDomain" DROP CONSTRAINT IF EXISTS "EmailDomain_locationId_fkey";
--> statement-breakpoint
ALTER TABLE "EmailDomain" DROP CONSTRAINT IF EXISTS "EmailDomain_providerAccountId_fkey";
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD CONSTRAINT "EmailDomain_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD CONSTRAINT "EmailDomain_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommunicationServiceProfile" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "emailState" "CommunicationChannelState" DEFAULT 'NOT_REQUESTED' NOT NULL,
  "smsState" "CommunicationChannelState" DEFAULT 'NOT_REQUESTED' NOT NULL,
  "voiceState" "CommunicationChannelState" DEFAULT 'NOT_REQUESTED' NOT NULL,
  "brandedEmailEntitledAt" timestamp(3),
  "smsEntitledAt" timestamp(3),
  "voiceEntitledAt" timestamp(3),
  "entitlementSource" text,
  "fallbackEmailEnabled" boolean DEFAULT true NOT NULL,
  "spendCurrency" varchar(3) DEFAULT 'GBP' NOT NULL,
  "smsMonthlySpendLimit" numeric(14, 4),
  "voiceMonthlySpendLimit" numeric(14, 4),
  "voiceMaxCallDurationSeconds" integer,
  "numberReleaseGraceDays" integer,
  "allowedSmsCountries" text[] DEFAULT '{}' NOT NULL,
  "allowedVoiceCountries" text[] DEFAULT '{}' NOT NULL,
  "voiceForwardingNumber" text,
  "voiceForwardingNumberVerifiedAt" timestamp(3),
  "voiceForwardingVerificationHash" text,
  "voiceForwardingVerificationExpiresAt" timestamp(3),
  "voiceForwardingVerificationAttempts" integer DEFAULT 0 NOT NULL,
  "voicemailEnabled" boolean DEFAULT false NOT NULL,
  "recordingEnabled" boolean DEFAULT false NOT NULL,
  "recordingRetentionDays" integer,
  "recordingLegalAcknowledgedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommunicationServiceProfile_sms_spend_limit_check" CHECK ("smsMonthlySpendLimit" IS NULL OR "smsMonthlySpendLimit" >= 0),
  CONSTRAINT "CommunicationServiceProfile_voice_spend_limit_check" CHECK ("voiceMonthlySpendLimit" IS NULL OR "voiceMonthlySpendLimit" >= 0),
  CONSTRAINT "CommunicationServiceProfile_voice_max_duration_check" CHECK ("voiceMaxCallDurationSeconds" IS NULL OR ("voiceMaxCallDurationSeconds" >= 60 AND "voiceMaxCallDurationSeconds" <= 14400)),
  CONSTRAINT "CommunicationServiceProfile_release_grace_days_check" CHECK ("numberReleaseGraceDays" IS NULL OR ("numberReleaseGraceDays" >= 0 AND "numberReleaseGraceDays" <= 365)),
  CONSTRAINT "CommunicationServiceProfile_recording_retention_check" CHECK ("recordingRetentionDays" IS NULL OR ("recordingRetentionDays" >= 1 AND "recordingRetentionDays" <= 3650)),
  CONSTRAINT "CommunicationServiceProfile_currency_check" CHECK ("spendCurrency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "CommunicationServiceProfile_recording_ack_check" CHECK ("recordingEnabled" = false OR "recordingLegalAcknowledgedAt" IS NOT NULL),
  CONSTRAINT "CommunicationServiceProfile_forwarding_verification_attempts_check" CHECK ("voiceForwardingVerificationAttempts" >= 0 AND "voiceForwardingVerificationAttempts" <= 10)
);
--> statement-breakpoint
ALTER TABLE "CommunicationServiceProfile" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationServiceProfile_organizationId_key" ON "CommunicationServiceProfile" USING btree ("organizationId");
--> statement-breakpoint
ALTER TABLE "CommunicationServiceProfile" ADD CONSTRAINT "CommunicationServiceProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
INSERT INTO "CommunicationServiceProfile" (
  "id",
  "organizationId",
  "emailState",
  "smsState",
  "voiceState",
  "brandedEmailEntitledAt",
  "smsEntitledAt",
  "entitlementSource",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-communications-' || substr(md5(scoped."organizationId"), 1, 20),
  scoped."organizationId",
  CASE WHEN bool_or(scoped."emailActive") THEN 'ACTIVE'::"CommunicationChannelState" ELSE 'NOT_REQUESTED'::"CommunicationChannelState" END,
  CASE WHEN bool_or(scoped."smsActive") THEN 'ACTIVE'::"CommunicationChannelState" ELSE 'NOT_REQUESTED'::"CommunicationChannelState" END,
  'NOT_REQUESTED'::"CommunicationChannelState",
  CASE WHEN bool_or(scoped."emailActive") THEN CURRENT_TIMESTAMP ELSE NULL END,
  CASE WHEN bool_or(scoped."smsActive") THEN CURRENT_TIMESTAMP ELSE NULL END,
  'LEGACY_MIGRATION',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    account."organizationId",
    account."provider" = 'RESEND' AND account."status" = 'ACTIVE' AS "emailActive",
    false AS "smsActive"
  FROM "ProviderAccount" account
  WHERE account."provider" = 'RESEND'
  UNION ALL
  SELECT
    sms."organizationId",
    false AS "emailActive",
    sms."isActive" = true AND account."status" = 'ACTIVE' AS "smsActive"
  FROM "SmsConfig" sms
  INNER JOIN "ProviderAccount" account ON account."id" = sms."providerAccountId"
) scoped
GROUP BY scoped."organizationId"
ON CONFLICT ("organizationId") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "CommunicationEntitlementGrant" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "source" text NOT NULL,
  "externalSubscriptionId" text NOT NULL,
  "externalProductId" text NOT NULL,
  "status" text NOT NULL,
  "emailEnabled" boolean DEFAULT false NOT NULL,
  "smsEnabled" boolean DEFAULT false NOT NULL,
  "voiceEnabled" boolean DEFAULT false NOT NULL,
  "regulatoryRequirement" text DEFAULT 'none' NOT NULL,
  "currentPeriodEnd" timestamp(3),
  "providerModifiedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommunicationEntitlementGrant_status_check" CHECK ("status" IN ('ACTIVE', 'CANCELED', 'REVOKED'))
);
--> statement-breakpoint
ALTER TABLE "CommunicationEntitlementGrant" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationEntitlementGrant_source_subscription_key" ON "CommunicationEntitlementGrant" USING btree ("source", "externalSubscriptionId");
--> statement-breakpoint
CREATE INDEX "CommunicationEntitlementGrant_organization_status_idx" ON "CommunicationEntitlementGrant" USING btree ("organizationId", "status");
--> statement-breakpoint
ALTER TABLE "CommunicationEntitlementGrant" ADD CONSTRAINT "CommunicationEntitlementGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "TwilioComplianceRegistration" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "country" varchar(2) NOT NULL,
  "channel" text NOT NULL,
  "programType" text NOT NULL,
  "numberType" text NOT NULL,
  "status" text DEFAULT 'NOT_CONFIGURED' NOT NULL,
  "providerStatus" text,
  "addressSid" text,
  "bundleSid" text,
  "identitySid" text,
  "messagingServiceSid" text,
  "campaignSid" text,
  "submittedAt" timestamp(3),
  "approvedAt" timestamp(3),
  "lastCheckedAt" timestamp(3),
  "lastErrorCode" text,
  "lastErrorMessage" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "TwilioComplianceRegistration_country_check" CHECK ("country" ~ '^[A-Z]{2}$'),
  CONSTRAINT "TwilioComplianceRegistration_channel_check" CHECK ("channel" IN ('SMS', 'VOICE', 'BOTH')),
  CONSTRAINT "TwilioComplianceRegistration_status_check" CHECK ("status" IN ('NOT_CONFIGURED', 'PENDING', 'APPROVED', 'REJECTED', 'DEGRADED'))
);
--> statement-breakpoint
ALTER TABLE "TwilioComplianceRegistration" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioComplianceRegistration_scope_program_key" ON "TwilioComplianceRegistration" USING btree ("organizationId", "providerAccountId", "country", "channel", "programType", "numberType");
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioComplianceRegistration_organizationId_id_key" ON "TwilioComplianceRegistration" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE INDEX "TwilioComplianceRegistration_scope_status_idx" ON "TwilioComplianceRegistration" USING btree ("organizationId", "status");
--> statement-breakpoint
ALTER TABLE "TwilioComplianceRegistration" ADD CONSTRAINT "TwilioComplianceRegistration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "TwilioComplianceRegistration" ADD CONSTRAINT "TwilioComplianceRegistration_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommunicationPhoneNumberQuote" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "providerAccountId" text NOT NULL,
  "phoneNumber" text NOT NULL,
  "country" varchar(2) NOT NULL,
  "numberType" text NOT NULL,
  "smsEnabled" boolean DEFAULT false NOT NULL,
  "voiceEnabled" boolean DEFAULT false NOT NULL,
  "regulatoryRequirement" text DEFAULT 'none' NOT NULL,
  "monthlyProviderCost" numeric(14, 4) NOT NULL,
  "currency" varchar(3) NOT NULL,
  "expiresAt" timestamp(3) NOT NULL,
  "consumedAt" timestamp(3),
  "createdByUserId" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommunicationPhoneNumberQuote_provider_cost_check" CHECK ("monthlyProviderCost" >= 0),
  CONSTRAINT "CommunicationPhoneNumberQuote_country_check" CHECK ("country" ~ '^[A-Z]{2}$'),
  CONSTRAINT "CommunicationPhoneNumberQuote_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "CommunicationPhoneNumberQuote_regulatory_requirement_check" CHECK ("regulatoryRequirement" IN ('none', 'any', 'local', 'foreign'))
);
--> statement-breakpoint
ALTER TABLE "CommunicationPhoneNumberQuote" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "CommunicationPhoneNumberQuote_scope_expiresAt_idx" ON "CommunicationPhoneNumberQuote" USING btree ("organizationId", "locationId", "expiresAt");
--> statement-breakpoint
ALTER TABLE "CommunicationPhoneNumberQuote" ADD CONSTRAINT "CommunicationPhoneNumberQuote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationPhoneNumberQuote" ADD CONSTRAINT "CommunicationPhoneNumberQuote_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationPhoneNumberQuote" ADD CONSTRAINT "CommunicationPhoneNumberQuote_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationPhoneNumberQuote" ADD CONSTRAINT "CommunicationPhoneNumberQuote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "TwilioPhoneNumber" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "providerAccountId" text NOT NULL,
  "complianceRegistrationId" text,
  "messagingServiceSid" text,
  "providerPhoneNumberId" text NOT NULL,
  "phoneNumber" text NOT NULL,
  "country" varchar(2) NOT NULL,
  "numberType" text NOT NULL,
  "smsEnabled" boolean DEFAULT false NOT NULL,
  "voiceEnabled" boolean DEFAULT false NOT NULL,
  "status" "TwilioPhoneNumberStatus" DEFAULT 'PENDING' NOT NULL,
  "complianceStatus" text DEFAULT 'NOT_REQUIRED' NOT NULL,
  "isDefault" boolean DEFAULT false NOT NULL,
  "monthlyProviderCost" numeric(14, 4) DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'GBP' NOT NULL,
  "purchaseConfirmedAt" timestamp(3),
  "purchasedAt" timestamp(3),
  "webhooksConfiguredAt" timestamp(3),
  "suspendedAt" timestamp(3),
  "releaseScheduledAt" timestamp(3),
  "releasedAt" timestamp(3),
  "lastHealthCheckAt" timestamp(3),
  "lastErrorCode" text,
  "lastErrorMessage" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "TwilioPhoneNumber_monthly_provider_cost_check" CHECK ("monthlyProviderCost" >= 0),
  CONSTRAINT "TwilioPhoneNumber_country_check" CHECK ("country" ~ '^[A-Z]{2}$'),
  CONSTRAINT "TwilioPhoneNumber_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioPhoneNumber_organizationId_id_key" ON "TwilioPhoneNumber" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioPhoneNumber_org_provider_id_key" ON "TwilioPhoneNumber" USING btree ("organizationId", "providerAccountId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioPhoneNumber_provider_resource_key" ON "TwilioPhoneNumber" USING btree ("providerAccountId", "providerPhoneNumberId");
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioPhoneNumber_active_number_key" ON "TwilioPhoneNumber" USING btree ("phoneNumber") WHERE "status" <> 'RELEASED';
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioPhoneNumber_organization_default_key" ON "TwilioPhoneNumber" USING btree ("organizationId") WHERE "locationId" IS NULL AND "isDefault" = true AND "status" <> 'RELEASED';
--> statement-breakpoint
CREATE UNIQUE INDEX "TwilioPhoneNumber_location_default_key" ON "TwilioPhoneNumber" USING btree ("organizationId", "locationId") WHERE "locationId" IS NOT NULL AND "isDefault" = true AND "status" <> 'RELEASED';
--> statement-breakpoint
CREATE INDEX "TwilioPhoneNumber_scope_status_idx" ON "TwilioPhoneNumber" USING btree ("organizationId", "locationId", "status");
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" ADD CONSTRAINT "TwilioPhoneNumber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" ADD CONSTRAINT "TwilioPhoneNumber_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" ADD CONSTRAINT "TwilioPhoneNumber_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "TwilioPhoneNumber" ADD CONSTRAINT "TwilioPhoneNumber_organizationId_complianceRegistrationId_fkey" FOREIGN KEY ("organizationId", "complianceRegistrationId") REFERENCES "public"."TwilioComplianceRegistration"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "VoiceCall" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "clientId" text,
  "providerAccountId" text NOT NULL,
  "phoneNumberId" text NOT NULL,
  "direction" "VoiceCallDirection" NOT NULL,
  "status" "VoiceCallStatus" DEFAULT 'QUEUED' NOT NULL,
  "providerCallId" text,
  "fromNumber" text NOT NULL,
  "toNumber" text NOT NULL,
  "forwardingNumber" text,
  "recordingEnabled" boolean DEFAULT false NOT NULL,
  "recordingProviderId" text,
  "recordingObjectKey" text,
  "startedAt" timestamp(3),
  "answeredAt" timestamp(3),
  "endedAt" timestamp(3),
  "durationSeconds" integer,
  "providerCost" numeric(14, 4) DEFAULT 0 NOT NULL,
  "providerCostCurrency" varchar(3),
  "providerCostReconciledAt" timestamp(3),
  "customerCharge" numeric(14, 4) DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'GBP' NOT NULL,
  "failureCode" text,
  "failureMessage" text,
  "idempotencyKey" text NOT NULL,
  "claimToken" text,
  "leaseExpiresAt" timestamp(3),
  "attemptCount" integer DEFAULT 0 NOT NULL,
  "maxAttempts" integer DEFAULT 5 NOT NULL,
  "nextAttemptAt" timestamp(3),
  "recordingDeleteScheduledAt" timestamp(3),
  "recordingDeletedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "VoiceCall_duration_check" CHECK ("durationSeconds" IS NULL OR "durationSeconds" >= 0),
  CONSTRAINT "VoiceCall_provider_cost_check" CHECK ("providerCost" >= 0),
  CONSTRAINT "VoiceCall_provider_cost_currency_check" CHECK ("providerCostCurrency" IS NULL OR "providerCostCurrency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "VoiceCall_customer_charge_check" CHECK ("customerCharge" >= 0),
  CONSTRAINT "VoiceCall_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "VoiceCall_attempts_check" CHECK ("attemptCount" >= 0 AND "maxAttempts" > 0)
);
--> statement-breakpoint
ALTER TABLE "VoiceCall" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "VoiceCall_organizationId_id_key" ON "VoiceCall" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "VoiceCall_provider_call_key" ON "VoiceCall" USING btree ("providerAccountId", "providerCallId") WHERE "providerCallId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "VoiceCall_organization_idempotency_key" ON "VoiceCall" USING btree ("organizationId", "idempotencyKey");
--> statement-breakpoint
CREATE INDEX "VoiceCall_scope_createdAt_idx" ON "VoiceCall" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
CREATE INDEX "VoiceCall_status_idx" ON "VoiceCall" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_organizationId_clientId_fkey" FOREIGN KEY ("organizationId", "clientId") REFERENCES "public"."Client"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_org_provider_phoneNumberId_fkey" FOREIGN KEY ("organizationId", "providerAccountId", "phoneNumberId") REFERENCES "public"."TwilioPhoneNumber"("organizationId", "providerAccountId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommunicationProvisioningOperation" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "providerAccountId" text,
  "emailDomainId" text,
  "phoneNumberId" text,
  "service" "CommunicationProvisioningService" NOT NULL,
  "operationType" "CommunicationProvisioningOperationType" NOT NULL,
  "status" "CommunicationProvisioningStatus" DEFAULT 'PENDING' NOT NULL,
  "idempotencyKey" text NOT NULL,
  "claimToken" text,
  "leaseExpiresAt" timestamp(3),
  "attemptCount" integer DEFAULT 0 NOT NULL,
  "maxAttempts" integer DEFAULT 5 NOT NULL,
  "nextAttemptAt" timestamp(3),
  "externalResourceId" text,
  "safeInput" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "requestedByUserId" text,
  "lastErrorCode" text,
  "lastErrorMessage" text,
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommunicationProvisioningOperation_attempts_check" CHECK ("attemptCount" >= 0 AND "maxAttempts" > 0)
);
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationProvisioningOperation_organizationId_idempotencyKey_key" ON "CommunicationProvisioningOperation" USING btree ("organizationId", "idempotencyKey");
--> statement-breakpoint
CREATE INDEX "CommunicationProvisioningOperation_status_nextAttemptAt_idx" ON "CommunicationProvisioningOperation" USING btree ("status", "nextAttemptAt");
--> statement-breakpoint
CREATE INDEX "CommunicationProvisioningOperation_leaseExpiresAt_idx" ON "CommunicationProvisioningOperation" USING btree ("leaseExpiresAt");
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_emailDomainId_fkey" FOREIGN KEY ("organizationId", "emailDomainId") REFERENCES "public"."EmailDomain"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_organizationId_phoneNumberId_fkey" FOREIGN KEY ("organizationId", "phoneNumberId") REFERENCES "public"."TwilioPhoneNumber"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationProvisioningOperation" ADD CONSTRAINT "CommunicationProvisioningOperation_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommunicationAuditEvent" (
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
CREATE INDEX "CommunicationAuditEvent_scope_createdAt_idx" ON "CommunicationAuditEvent" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" ADD CONSTRAINT "CommunicationAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" ADD CONSTRAINT "CommunicationAuditEvent_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationAuditEvent" ADD CONSTRAINT "CommunicationAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommunicationUsageLedger" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "clientId" text,
  "provider" "DeliveryProvider" NOT NULL,
  "providerAccountId" text,
  "phoneNumberId" text,
  "deliveryId" text,
  "voiceCallId" text,
  "entryKind" "CommunicationUsageEntryKind" NOT NULL,
  "resourceType" "CommunicationUsageResourceType" NOT NULL,
  "idempotencyKey" text NOT NULL,
  "providerEventId" text,
  "providerResourceId" text,
  "quantity" numeric(18, 6) NOT NULL,
  "unit" text NOT NULL,
  "providerCost" numeric(14, 4) DEFAULT 0 NOT NULL,
  "customerCharge" numeric(14, 4) DEFAULT 0 NOT NULL,
  "currency" varchar(3) NOT NULL,
  "occurredAt" timestamp(3) NOT NULL,
  "billingPeriod" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CommunicationUsageLedger_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "CommunicationUsageLedger_provider_cost_check" CHECK ("providerCost" >= 0),
  CONSTRAINT "CommunicationUsageLedger_customer_charge_check" CHECK ("customerCharge" >= 0),
  CONSTRAINT "CommunicationUsageLedger_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "OutboundDelivery_organizationId_id_key" ON "OutboundDelivery" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationUsageLedger_organization_idempotency_key" ON "CommunicationUsageLedger" USING btree ("organizationId", "idempotencyKey");
--> statement-breakpoint
CREATE INDEX "CommunicationUsageLedger_scope_occurredAt_idx" ON "CommunicationUsageLedger" USING btree ("organizationId", "locationId", "occurredAt");
--> statement-breakpoint
CREATE INDEX "CommunicationUsageLedger_provider_resource_idx" ON "CommunicationUsageLedger" USING btree ("provider", "providerAccountId", "providerResourceId");
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_clientId_fkey" FOREIGN KEY ("organizationId", "clientId") REFERENCES "public"."Client"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_org_provider_phoneNumberId_fkey" FOREIGN KEY ("organizationId", "providerAccountId", "phoneNumberId") REFERENCES "public"."TwilioPhoneNumber"("organizationId", "providerAccountId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_deliveryId_fkey" FOREIGN KEY ("organizationId", "deliveryId") REFERENCES "public"."OutboundDelivery"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationUsageLedger" ADD CONSTRAINT "CommunicationUsageLedger_organizationId_voiceCallId_fkey" FOREIGN KEY ("organizationId", "voiceCallId") REFERENCES "public"."VoiceCall"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommunicationWebhookReceipt" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text,
  "locationId" text,
  "provider" "DeliveryProvider" NOT NULL,
  "providerAccountId" text,
  "providerAccountRef" text NOT NULL,
  "eventType" text NOT NULL,
  "providerEventId" text NOT NULL,
  "providerResourceId" text NOT NULL,
  "status" "InboundMessageReceiptStatus" DEFAULT 'PENDING' NOT NULL,
  "payloadHash" text NOT NULL,
  "encryptedPayload" text NOT NULL,
  "safeMetadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "attemptCount" integer DEFAULT 0 NOT NULL,
  "claimToken" text,
  "leaseExpiresAt" timestamp(3),
  "occurredAt" timestamp(3) NOT NULL,
  "receivedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "processedAt" timestamp(3),
  "lastErrorCode" text,
  "lastErrorMessage" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationWebhookReceipt_provider_event_key" ON "CommunicationWebhookReceipt" USING btree ("provider", "providerAccountRef", "eventType", "providerEventId");
--> statement-breakpoint
CREATE INDEX "CommunicationWebhookReceipt_status_lease_idx" ON "CommunicationWebhookReceipt" USING btree ("status", "leaseExpiresAt");
--> statement-breakpoint
CREATE INDEX "CommunicationWebhookReceipt_scope_receivedAt_idx" ON "CommunicationWebhookReceipt" USING btree ("organizationId", "locationId", "receivedAt");
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" ADD CONSTRAINT "CommunicationWebhookReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" ADD CONSTRAINT "CommunicationWebhookReceipt_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationWebhookReceipt" ADD CONSTRAINT "CommunicationWebhookReceipt_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "public"."ProviderAccount"("organizationId", "id") ON DELETE restrict ON UPDATE cascade;
