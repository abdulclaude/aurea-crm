DO $$ BEGIN
 CREATE TYPE "public"."StripeEventStatus" AS ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED', 'DEAD_LETTER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceLedgerKind" AS ENUM('PAYMENT', 'REFUND', 'DISPUTE', 'PAYOUT', 'CREDIT', 'ADJUSTMENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceLedgerStatus" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED', 'WON', 'LOST', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceReconciliationIssueType" AS ENUM('MISSING_PROVIDER_RECORD', 'MISSING_LOCAL_RECORD', 'AMOUNT_MISMATCH', 'CURRENCY_MISMATCH', 'STATUS_MISMATCH', 'DUPLICATE_RECORD', 'ORPHANED_REFERENCE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceReconciliationSeverity" AS ENUM('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceReconciliationStatus" AS ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceReconciliationRunStatus" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceOperationType" AS ENUM('CHECKOUT', 'REFUND', 'RECONCILIATION', 'CREDIT_ADJUSTMENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceOperationStatus" AS ENUM('CREATED', 'PROVIDER_PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CommerceTenderType" AS ENUM('STRIPE', 'GIFT_CARD', 'ACCOUNT_CREDIT', 'PROMOTION', 'MANUAL', 'BANK_TRANSFER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "status" "StripeEventStatus";
--> statement-breakpoint
UPDATE "StripeEvent" SET "status" = 'PROCESSED' WHERE "status" IS NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ALTER COLUMN "status" SET DEFAULT 'RECEIVED';
--> statement-breakpoint
ALTER TABLE "StripeEvent" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'PLATFORM' NOT NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "stripeAccountId" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "apiVersion" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "livemode" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "objectId" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "objectType" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "payloadHash" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "encryptedPayload" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "payloadExpiresAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "StripeEvent" SET "attempts" = 1 WHERE "attempts" = 0 AND "processedAt" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "maxAttempts" integer DEFAULT 8 NOT NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "receivedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;
--> statement-breakpoint
UPDATE "StripeEvent" SET "receivedAt" = "processedAt" WHERE "processedAt" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "lastAttemptAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "nextAttemptAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "StripeEvent" ALTER COLUMN "processedAt" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ALTER COLUMN "processedAt" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "errorCode" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "errorMessage" text;
--> statement-breakpoint
ALTER TABLE "StripeEvent" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "StripeEvent_status_nextAttemptAt_idx" ON "StripeEvent" USING btree ("status", "nextAttemptAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "StripeEvent_stripeAccountId_idx" ON "StripeEvent" USING btree ("stripeAccountId");
--> statement-breakpoint
CREATE TABLE "CommerceOperation" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "clientId" text,
 "type" "CommerceOperationType" NOT NULL,
 "status" "CommerceOperationStatus" DEFAULT 'CREATED' NOT NULL,
 "provider" text NOT NULL,
 "providerAccountId" text,
 "idempotencyKey" text NOT NULL,
 "amountMinor" bigint NOT NULL,
 "currency" text NOT NULL,
 "currencyExponent" integer DEFAULT 2 NOT NULL,
 "invoiceId" text,
 "bookingId" text,
 "studioBookingId" text,
 "membershipId" text,
 "studioPaymentId" text,
 "providerCheckoutSessionId" text,
 "providerPaymentIntentId" text,
 "providerRefundId" text,
 "requestedBy" text,
 "failureCode" text,
 "failureMessage" text,
 "expiresAt" timestamp(3),
 "completedAt" timestamp(3),
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceOperation_idempotencyKey_key" ON "CommerceOperation" USING btree ("idempotencyKey");
--> statement-breakpoint
CREATE INDEX "CommerceOperation_scope_createdAt_idx" ON "CommerceOperation" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
CREATE INDEX "CommerceOperation_status_idx" ON "CommerceOperation" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "CommerceOperation_providerCheckoutSessionId_idx" ON "CommerceOperation" USING btree ("providerCheckoutSessionId");
--> statement-breakpoint
CREATE INDEX "CommerceOperation_providerPaymentIntentId_idx" ON "CommerceOperation" USING btree ("providerPaymentIntentId");
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_studioBookingId_fkey" FOREIGN KEY ("studioBookingId") REFERENCES "public"."StudioBooking"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."StudioMembership"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_studioPaymentId_fkey" FOREIGN KEY ("studioPaymentId") REFERENCES "public"."StudioPayment"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceOperation" ADD CONSTRAINT "CommerceOperation_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommerceLedgerEntry" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "operationId" text,
 "provider" text NOT NULL,
 "providerAccountId" text,
 "idempotencyKey" text NOT NULL,
 "providerObjectId" text NOT NULL,
 "providerObjectType" text NOT NULL,
 "kind" "CommerceLedgerKind" NOT NULL,
 "status" "CommerceLedgerStatus" NOT NULL,
 "paymentIntentId" text,
 "chargeId" text,
 "checkoutSessionId" text,
 "amountMinor" bigint NOT NULL,
 "feeMinor" bigint,
 "netMinor" bigint,
 "currency" text NOT NULL,
 "currencyExponent" integer DEFAULT 2 NOT NULL,
 "clientId" text,
 "membershipId" text,
 "bookingId" text,
 "studioBookingId" text,
 "invoiceId" text,
 "studioPaymentId" text,
 "invoicePaymentId" text,
 "stripeEventId" text,
 "occurredAt" timestamp(3) NOT NULL,
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceLedgerEntry_idempotencyKey_key" ON "CommerceLedgerEntry" USING btree ("idempotencyKey");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_organizationId_occurredAt_idx" ON "CommerceLedgerEntry" USING btree ("organizationId", "occurredAt");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_locationId_occurredAt_idx" ON "CommerceLedgerEntry" USING btree ("locationId", "occurredAt");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_providerObjectId_idx" ON "CommerceLedgerEntry" USING btree ("providerObjectId");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_paymentIntentId_idx" ON "CommerceLedgerEntry" USING btree ("paymentIntentId");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_status_idx" ON "CommerceLedgerEntry" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_clientId_idx" ON "CommerceLedgerEntry" USING btree ("clientId");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_invoiceId_idx" ON "CommerceLedgerEntry" USING btree ("invoiceId");
--> statement-breakpoint
CREATE INDEX "CommerceLedgerEntry_studioPaymentId_idx" ON "CommerceLedgerEntry" USING btree ("studioPaymentId");
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "public"."CommerceOperation"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."StudioMembership"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_studioBookingId_fkey" FOREIGN KEY ("studioBookingId") REFERENCES "public"."StudioBooking"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_studioPaymentId_fkey" FOREIGN KEY ("studioPaymentId") REFERENCES "public"."StudioPayment"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_invoicePaymentId_fkey" FOREIGN KEY ("invoicePaymentId") REFERENCES "public"."InvoicePayment"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceLedgerEntry" ADD CONSTRAINT "CommerceLedgerEntry_stripeEventId_fkey" FOREIGN KEY ("stripeEventId") REFERENCES "public"."StripeEvent"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommerceTenderAllocation" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "ledgerEntryId" text NOT NULL,
 "type" "CommerceTenderType" NOT NULL,
 "amountMinor" bigint NOT NULL,
 "currency" text NOT NULL,
 "currencyExponent" integer DEFAULT 2 NOT NULL,
 "sourceId" text,
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommerceTenderAllocation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "CommerceTenderAllocation_ledgerEntryId_idx" ON "CommerceTenderAllocation" USING btree ("ledgerEntryId");
--> statement-breakpoint
CREATE INDEX "CommerceTenderAllocation_scope_type_idx" ON "CommerceTenderAllocation" USING btree ("organizationId", "locationId", "type");
--> statement-breakpoint
ALTER TABLE "CommerceTenderAllocation" ADD CONSTRAINT "CommerceTenderAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceTenderAllocation" ADD CONSTRAINT "CommerceTenderAllocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceTenderAllocation" ADD CONSTRAINT "CommerceTenderAllocation_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "public"."CommerceLedgerEntry"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommerceReconciliationRun" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "provider" text NOT NULL,
 "status" "CommerceReconciliationRunStatus" DEFAULT 'PENDING' NOT NULL,
 "requestedBy" text,
 "windowStart" timestamp(3) NOT NULL,
 "windowEnd" timestamp(3) NOT NULL,
 "providerRecords" integer DEFAULT 0 NOT NULL,
 "localRecords" integer DEFAULT 0 NOT NULL,
 "issuesFound" integer DEFAULT 0 NOT NULL,
 "startedAt" timestamp(3),
 "completedAt" timestamp(3),
 "errorMessage" text,
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationRun" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "CommerceReconciliationRun_scope_createdAt_idx" ON "CommerceReconciliationRun" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
CREATE INDEX "CommerceReconciliationRun_status_idx" ON "CommerceReconciliationRun" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationRun" ADD CONSTRAINT "CommerceReconciliationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationRun" ADD CONSTRAINT "CommerceReconciliationRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationRun" ADD CONSTRAINT "CommerceReconciliationRun_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "CommerceReconciliationIssue" (
 "id" text PRIMARY KEY NOT NULL,
 "organizationId" text NOT NULL,
 "locationId" text,
 "runId" text,
 "ledgerEntryId" text,
 "stripeEventId" text,
 "fingerprint" text NOT NULL,
 "type" "CommerceReconciliationIssueType" NOT NULL,
 "severity" "CommerceReconciliationSeverity" DEFAULT 'WARNING' NOT NULL,
 "status" "CommerceReconciliationStatus" DEFAULT 'OPEN' NOT NULL,
 "localEntityType" text,
 "localEntityId" text,
 "providerObjectId" text,
 "expected" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "actual" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "recoveryAction" text,
 "detectedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "lastSeenAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "acknowledgedAt" timestamp(3),
 "acknowledgedBy" text,
 "resolvedAt" timestamp(3),
 "resolvedBy" text,
 "resolutionNote" text,
 "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
 "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceReconciliationIssue_fingerprint_key" ON "CommerceReconciliationIssue" USING btree ("fingerprint");
--> statement-breakpoint
CREATE INDEX "CommerceReconciliationIssue_scope_status_idx" ON "CommerceReconciliationIssue" USING btree ("organizationId", "locationId", "status");
--> statement-breakpoint
CREATE INDEX "CommerceReconciliationIssue_providerObjectId_idx" ON "CommerceReconciliationIssue" USING btree ("providerObjectId");
--> statement-breakpoint
CREATE INDEX "CommerceReconciliationIssue_ledgerEntryId_idx" ON "CommerceReconciliationIssue" USING btree ("ledgerEntryId");
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ADD CONSTRAINT "CommerceReconciliationIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ADD CONSTRAINT "CommerceReconciliationIssue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ADD CONSTRAINT "CommerceReconciliationIssue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."CommerceReconciliationRun"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ADD CONSTRAINT "CommerceReconciliationIssue_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "public"."CommerceLedgerEntry"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ADD CONSTRAINT "CommerceReconciliationIssue_stripeEventId_fkey" FOREIGN KEY ("stripeEventId") REFERENCES "public"."StripeEvent"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ADD CONSTRAINT "CommerceReconciliationIssue_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "CommerceReconciliationIssue" ADD CONSTRAINT "CommerceReconciliationIssue_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
