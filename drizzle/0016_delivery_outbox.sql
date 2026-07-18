DO $$ BEGIN
 CREATE TYPE "public"."CampaignRunStatus" AS ENUM('PREPARING', 'QUEUED', 'SENDING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommunicationSuppressionReason" AS ENUM('UNSUBSCRIBE', 'COMPLAINT', 'HARD_BOUNCE', 'SMS_STOP', 'INVALID_DESTINATION', 'MANUAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommunicationSuppressionScope" AS ENUM('MARKETING', 'ALL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."DeliveryAttemptOutcome" AS ENUM('ACCEPTED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'AMBIGUOUS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."DeliveryChannel" AS ENUM('EMAIL', 'SMS', 'APP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."DeliveryFailureClass" AS ENUM('RETRYABLE', 'TERMINAL', 'AMBIGUOUS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."DeliveryProvider" AS ENUM('RESEND', 'GMAIL', 'OUTLOOK', 'TWILIO', 'VONAGE', 'MESSAGEBIRD', 'INTERNAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."DeliveryPurpose" AS ENUM('MARKETING', 'TRANSACTIONAL', 'ONE_TO_ONE', 'SYSTEM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."OutboundDeliveryStatus" AS ENUM('QUEUED', 'SENDING', 'ACCEPTED', 'DELIVERED', 'BOUNCED', 'SUPPRESSED', 'CANCELLED', 'DEAD_LETTER', 'UNKNOWN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "CampaignRun" (
 "id" text PRIMARY KEY NOT NULL,
 "campaignId" text NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "requestedBy" text,
 "status" "CampaignRunStatus" DEFAULT 'PREPARING' NOT NULL,
 "idempotencyKey" text NOT NULL,
 "scheduledFor" timestamp(3),
 "audienceSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "contentSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "senderSnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "totalRecipients" integer DEFAULT 0 NOT NULL,
 "queued" integer DEFAULT 0 NOT NULL,
 "accepted" integer DEFAULT 0 NOT NULL,
 "delivered" integer DEFAULT 0 NOT NULL,
 "bounced" integer DEFAULT 0 NOT NULL,
 "suppressed" integer DEFAULT 0 NOT NULL,
 "failed" integer DEFAULT 0 NOT NULL,
 "preparedAt" timestamp(3),
 "startedAt" timestamp(3),
 "completedAt" timestamp(3),
 "cancelledAt" timestamp(3),
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CampaignRun" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CampaignRun_organizationId_idempotencyKey_key" ON "CampaignRun" USING btree ("organizationId", "idempotencyKey");
--> statement-breakpoint
CREATE INDEX "CampaignRun_campaignId_createdAt_idx" ON "CampaignRun" USING btree ("campaignId", "createdAt");
--> statement-breakpoint
CREATE INDEX "CampaignRun_scope_createdAt_idx" ON "CampaignRun" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
CREATE INDEX "CampaignRun_status_scheduledFor_idx" ON "CampaignRun" USING btree ("status", "scheduledFor");
--> statement-breakpoint
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "OutboundDelivery" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "clientId" text,
 "workflowId" text,
 "executionId" text,
 "nodeId" text,
 "channel" "DeliveryChannel" NOT NULL,
 "purpose" "DeliveryPurpose" NOT NULL,
 "provider" "DeliveryProvider" NOT NULL,
 "status" "OutboundDeliveryStatus" DEFAULT 'QUEUED' NOT NULL,
 "providerAccountRef" text NOT NULL,
 "sourceType" text NOT NULL,
 "sourceId" text NOT NULL,
 "destination" text NOT NULL,
 "destinationNormalized" text NOT NULL,
 "senderRef" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "payloadVersion" integer DEFAULT 1 NOT NULL,
 "payload" jsonb NOT NULL,
 "idempotencyKey" text NOT NULL,
 "availableAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "nextAttemptAt" timestamp(3),
 "claimToken" text,
 "leaseExpiresAt" timestamp(3),
 "attemptCount" integer DEFAULT 0 NOT NULL,
 "maxAttempts" integer DEFAULT 5 NOT NULL,
 "providerMessageId" text,
 "providerRequestId" text,
 "lastFailureClass" "DeliveryFailureClass",
 "lastErrorCode" text,
 "lastErrorMessage" text,
 "delayedAt" timestamp(3),
 "acceptedAt" timestamp(3),
 "deliveredAt" timestamp(3),
 "bouncedAt" timestamp(3),
 "openedAt" timestamp(3),
 "clickedAt" timestamp(3),
 "readAt" timestamp(3),
 "cancelledAt" timestamp(3),
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "OutboundDelivery_organizationId_idempotencyKey_key" ON "OutboundDelivery" USING btree ("organizationId", "idempotencyKey");
--> statement-breakpoint
CREATE UNIQUE INDEX "OutboundDelivery_provider_message_key" ON "OutboundDelivery" USING btree ("provider", "providerAccountRef", "providerMessageId") WHERE "providerMessageId" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_scope_createdAt_idx" ON "OutboundDelivery" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_status_availableAt_idx" ON "OutboundDelivery" USING btree ("status", "availableAt");
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_status_nextAttemptAt_idx" ON "OutboundDelivery" USING btree ("status", "nextAttemptAt");
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_source_idx" ON "OutboundDelivery" USING btree ("sourceType", "sourceId");
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_clientId_createdAt_idx" ON "OutboundDelivery" USING btree ("clientId", "createdAt");
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_leaseExpiresAt_idx" ON "OutboundDelivery" USING btree ("leaseExpiresAt");
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflows"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."Execution"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."Node"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "DeliveryAttempt" (
 "id" text PRIMARY KEY NOT NULL,
 "deliveryId" text NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "attemptNumber" integer NOT NULL,
 "claimToken" text,
 "provider" "DeliveryProvider" NOT NULL,
 "outcome" "DeliveryAttemptOutcome",
 "providerMessageId" text,
 "providerRequestId" text,
 "httpStatus" integer,
 "errorClass" "DeliveryFailureClass",
 "errorCode" text,
 "errorMessage" text,
 "retryAfter" timestamp(3),
 "startedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "completedAt" timestamp(3),
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DeliveryAttempt" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "DeliveryAttempt_deliveryId_attemptNumber_key" ON "DeliveryAttempt" USING btree ("deliveryId", "attemptNumber");
--> statement-breakpoint
CREATE INDEX "DeliveryAttempt_scope_startedAt_idx" ON "DeliveryAttempt" USING btree ("organizationId", "locationId", "startedAt");
--> statement-breakpoint
CREATE INDEX "DeliveryAttempt_outcome_idx" ON "DeliveryAttempt" USING btree ("outcome");
--> statement-breakpoint
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."OutboundDelivery"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "DeliveryProviderEvent" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text,
 "locationId" text,
 "deliveryId" text,
 "provider" "DeliveryProvider" NOT NULL,
 "providerAccountRef" text NOT NULL,
 "providerEventId" text NOT NULL,
 "providerMessageId" text NOT NULL,
 "eventType" text NOT NULL,
 "occurredAt" timestamp(3) NOT NULL,
 "receivedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "verifiedAt" timestamp(3) NOT NULL,
 "payloadHash" text NOT NULL,
 "safeMetadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "appliedAt" timestamp(3),
 "applyError" text,
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DeliveryProviderEvent" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "DeliveryProviderEvent_provider_event_key" ON "DeliveryProviderEvent" USING btree ("provider", "providerAccountRef", "providerEventId");
--> statement-breakpoint
CREATE INDEX "DeliveryProviderEvent_deliveryId_idx" ON "DeliveryProviderEvent" USING btree ("deliveryId");
--> statement-breakpoint
CREATE INDEX "DeliveryProviderEvent_provider_message_idx" ON "DeliveryProviderEvent" USING btree ("provider", "providerAccountRef", "providerMessageId");
--> statement-breakpoint
CREATE INDEX "DeliveryProviderEvent_unmatched_idx" ON "DeliveryProviderEvent" USING btree ("receivedAt") WHERE "deliveryId" IS NULL;
--> statement-breakpoint
ALTER TABLE "DeliveryProviderEvent" ADD CONSTRAINT "DeliveryProviderEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "DeliveryProviderEvent" ADD CONSTRAINT "DeliveryProviderEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "DeliveryProviderEvent" ADD CONSTRAINT "DeliveryProviderEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."OutboundDelivery"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommunicationSuppression" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "clientId" text,
 "channel" "DeliveryChannel" NOT NULL,
 "scope" "CommunicationSuppressionScope" NOT NULL,
 "reason" "CommunicationSuppressionReason" NOT NULL,
 "destinationNormalized" text NOT NULL,
 "sourceDeliveryId" text,
 "createdBy" text,
 "activeAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "expiresAt" timestamp(3),
 "revokedAt" timestamp(3),
 "revokedBy" text,
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommunicationSuppression" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationSuppression_location_active_key" ON "CommunicationSuppression" USING btree ("organizationId", "locationId", "channel", "destinationNormalized", "scope") WHERE "locationId" IS NOT NULL AND "revokedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationSuppression_organization_active_key" ON "CommunicationSuppression" USING btree ("organizationId", "channel", "destinationNormalized", "scope") WHERE "locationId" IS NULL AND "revokedAt" IS NULL;
--> statement-breakpoint
CREATE INDEX "CommunicationSuppression_scope_destination_idx" ON "CommunicationSuppression" USING btree ("organizationId", "locationId", "channel", "destinationNormalized");
--> statement-breakpoint
CREATE INDEX "CommunicationSuppression_clientId_idx" ON "CommunicationSuppression" USING btree ("clientId");
--> statement-breakpoint
ALTER TABLE "CommunicationSuppression" ADD CONSTRAINT "CommunicationSuppression_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationSuppression" ADD CONSTRAINT "CommunicationSuppression_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationSuppression" ADD CONSTRAINT "CommunicationSuppression_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationSuppression" ADD CONSTRAINT "CommunicationSuppression_sourceDeliveryId_fkey" FOREIGN KEY ("sourceDeliveryId") REFERENCES "public"."OutboundDelivery"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationSuppression" ADD CONSTRAINT "CommunicationSuppression_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommunicationSuppression" ADD CONSTRAINT "CommunicationSuppression_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "deliveryId" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "InboxMessage_deliveryId_key" ON "InboxMessage" USING btree ("deliveryId") WHERE "deliveryId" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."OutboundDelivery"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "SmsMessage" ADD COLUMN IF NOT EXISTS "deliveryId" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "SmsMessage_deliveryId_key" ON "SmsMessage" USING btree ("deliveryId") WHERE "deliveryId" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."OutboundDelivery"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "runId" text;
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "deliveryId" text;
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "recipientAddress" text;
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "suppressionReason" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "CampaignRecipient_runId_idx" ON "CampaignRecipient" USING btree ("runId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_deliveryId_key" ON "CampaignRecipient" USING btree ("deliveryId") WHERE "deliveryId" IS NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "CampaignRecipient_campaignId_clientId_key";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_legacy_campaignId_clientId_key" ON "CampaignRecipient" USING btree ("campaignId", "clientId") WHERE "runId" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_runId_clientId_key" ON "CampaignRecipient" USING btree ("runId", "clientId") WHERE "runId" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."CampaignRun"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."OutboundDelivery"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD COLUMN IF NOT EXISTS "organizationId" text;
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD COLUMN IF NOT EXISTS "locationId" text;
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD COLUMN IF NOT EXISTS "deliveryId" text;
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD COLUMN IF NOT EXISTS "channel" "DeliveryChannel";
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD COLUMN IF NOT EXISTS "suppressionScope" "CommunicationSuppressionScope";
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD COLUMN IF NOT EXISTS "tokenHash" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "UnsubscribeToken_deliveryId_idx" ON "UnsubscribeToken" USING btree ("deliveryId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UnsubscribeToken_tokenHash_key" ON "UnsubscribeToken" USING btree ("tokenHash") WHERE "tokenHash" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD CONSTRAINT "UnsubscribeToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD CONSTRAINT "UnsubscribeToken_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "UnsubscribeToken" ADD CONSTRAINT "UnsubscribeToken_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."OutboundDelivery"("id") ON DELETE set null ON UPDATE cascade;
