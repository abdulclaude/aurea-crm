ALTER TYPE "public"."StudioMembershipStatus"
  ADD VALUE IF NOT EXISTS 'PAST_DUE';

DO $$ BEGIN
  CREATE TYPE "public"."BookingPaymentStatus" AS ENUM (
    'NOT_REQUIRED', 'REQUIRES_PAYMENT', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."BookingEntitlementAllocationStatus" AS ENUM ('ACTIVE', 'RESTORED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."BookingEntitlementSource" AS ENUM (
    'MEMBERSHIP_CREDIT', 'MEMBERSHIP_ALLOWANCE', 'FREE', 'UNPAID_ALLOWED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentRecoveryPolicyMode" AS ENUM ('INHERIT', 'ENABLED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentRecoveryTarget" AS ENUM ('INVOICE', 'MEMBERSHIP', 'BOOKING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentRecoveryCaseStatus" AS ENUM (
    'OPEN', 'IN_PROGRESS', 'RECOVERED', 'EXHAUSTED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentRecoveryActionType" AS ENUM (
    'SEND_EMAIL', 'SEND_SMS', 'GRACE_PERIOD_END', 'ESCALATE', 'EXPIRE_BOOKING',
    'RELEASE_BOOKING', 'RETRY_PAYMENT', 'CREATE_TASK'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentRecoveryActionStatus" AS ENUM (
    'SCHEDULED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentRecoveryAttemptType" AS ENUM (
    'PROVIDER_EVENT', 'DELIVERY', 'PROVIDER_RETRY', 'OPERATOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."PaymentRecoveryAttemptStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Booking"
  ADD COLUMN "paymentStatus" "BookingPaymentStatus" DEFAULT 'NOT_REQUIRED' NOT NULL,
  ADD COLUMN "holdExpiresAt" timestamp(3),
  ADD COLUMN "paymentRequiredAt" timestamp(3),
  ADD COLUMN "paymentFailureAt" timestamp(3),
  ADD COLUMN "confirmedAt" timestamp(3),
  ADD COLUMN "releasedAt" timestamp(3);

UPDATE "Booking"
SET
  "paymentStatus" = CASE
    WHEN "paid" = true THEN 'PAID'::"BookingPaymentStatus"
    WHEN "amount" IS NOT NULL AND "amount" > 0 THEN 'REQUIRES_PAYMENT'::"BookingPaymentStatus"
    ELSE 'NOT_REQUIRED'::"BookingPaymentStatus"
  END,
  "paymentRequiredAt" = CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "createdAt" ELSE NULL END,
  "confirmedAt" = CASE WHEN "status" = 'CONFIRMED' THEN "createdAt" ELSE NULL END;

CREATE INDEX "Booking_paymentStatus_holdExpiresAt_idx"
  ON "Booking" USING btree ("paymentStatus", "holdExpiresAt");
CREATE UNIQUE INDEX "Booking_organizationId_id_key"
  ON "Booking" USING btree ("organizationId", "id");
CREATE UNIQUE INDEX "Booking_scope_id_key"
  ON "Booking" USING btree ("organizationId", "locationId", "id");

ALTER TABLE "StudioMembership"
  ADD COLUMN "paymentFailureAt" timestamp(3),
  ADD COLUMN "paymentGraceEndsAt" timestamp(3);

ALTER TABLE "InvoiceReminder"
  ADD COLUMN "organizationId" text,
  ADD COLUMN "locationId" text,
  ADD COLUMN "deliveryStatus" "OutboundDeliveryStatus" DEFAULT 'DELIVERED' NOT NULL,
  ADD COLUMN "providerAccountId" text,
  ADD COLUMN "outboundDeliveryId" text,
  ADD COLUMN "policyId" text,
  ADD COLUMN "policyVersion" integer,
  ADD COLUMN "stepKey" text,
  ADD COLUMN "queuedAt" timestamp(3),
  ADD COLUMN "deliveredAt" timestamp(3),
  ADD COLUMN "failedAt" timestamp(3),
  ADD COLUMN "failureMessage" text;

UPDATE "InvoiceReminder" reminder
SET
  "organizationId" = invoice."organizationId",
  "locationId" = invoice."locationId",
  "queuedAt" = reminder."sentAt",
  "deliveredAt" = reminder."sentAt"
FROM "Invoice" invoice
WHERE invoice."id" = reminder."invoiceId";

ALTER TABLE "InvoiceReminder"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "sentAt" DROP DEFAULT,
  ALTER COLUMN "sentAt" DROP NOT NULL,
  ALTER COLUMN "deliveryStatus" SET DEFAULT 'QUEUED';

CREATE INDEX "InvoiceReminder_scope_status_idx"
  ON "InvoiceReminder" USING btree ("organizationId", "locationId", "deliveryStatus");
CREATE UNIQUE INDEX "InvoiceReminder_stepKey_key"
  ON "InvoiceReminder" USING btree ("stepKey") WHERE "stepKey" IS NOT NULL;

ALTER TABLE "InvoiceReminder"
  ADD CONSTRAINT "InvoiceReminder_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "InvoiceReminder_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "InvoiceReminder_providerAccountId_fkey"
  FOREIGN KEY ("providerAccountId") REFERENCES "ProviderAccount"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "InvoiceReminder_outboundDeliveryId_fkey"
  FOREIGN KEY ("outboundDeliveryId") REFERENCES "OutboundDelivery"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX "CommerceOperation_active_booking_checkout_key"
  ON "CommerceOperation" USING btree ("bookingId")
  WHERE "bookingId" IS NOT NULL
    AND "type" = 'CHECKOUT'
    AND "status" IN ('CREATED', 'PROVIDER_PENDING', 'REQUIRES_ACTION');

ALTER TABLE "CommerceOperation"
  ADD CONSTRAINT "CommerceOperation_booking_scope_fkey"
  FOREIGN KEY ("organizationId", "bookingId")
  REFERENCES "Booking"("organizationId", "id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "CommerceOperation_booking_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "bookingId")
  REFERENCES "Booking"("organizationId", "locationId", "id") ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE UNIQUE INDEX "BankTransferSettings_organization_scope_key"
  ON "BankTransferSettings" USING btree ("organizationId") WHERE "locationId" IS NULL;

CREATE TABLE "BookingEntitlementAllocation" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "bookingId" text NOT NULL,
  "clientId" text NOT NULL,
  "membershipId" text,
  "classCreditId" text,
  "source" "BookingEntitlementSource" NOT NULL,
  "status" "BookingEntitlementAllocationStatus" DEFAULT 'ACTIVE' NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "allocatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "restoredAt" timestamp(3),
  "restoredBy" text,
  "voidedAt" timestamp(3),
  "createdBy" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "BookingEntitlementAllocation_quantity_check" CHECK ("quantity" = 1),
  CONSTRAINT "BookingEntitlementAllocation_membership_source_check"
    CHECK ("source" NOT IN ('MEMBERSHIP_CREDIT', 'MEMBERSHIP_ALLOWANCE') OR "membershipId" IS NOT NULL)
);

CREATE UNIQUE INDEX "BookingEntitlementAllocation_active_booking_key"
  ON "BookingEntitlementAllocation" USING btree ("bookingId") WHERE "status" = 'ACTIVE';
CREATE INDEX "BookingEntitlementAllocation_scope_createdAt_idx"
  ON "BookingEntitlementAllocation" USING btree ("organizationId", "locationId", "createdAt");
CREATE INDEX "BookingEntitlementAllocation_clientId_idx"
  ON "BookingEntitlementAllocation" USING btree ("clientId");

ALTER TABLE "BookingEntitlementAllocation"
  ADD CONSTRAINT "BookingEntitlementAllocation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "BookingEntitlementAllocation_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "BookingEntitlementAllocation_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "StudioBooking"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "BookingEntitlementAllocation_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "BookingEntitlementAllocation_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "StudioMembership"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "BookingEntitlementAllocation_classCreditId_fkey"
  FOREIGN KEY ("classCreditId") REFERENCES "ClassCredit"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "BookingEntitlementAllocation_restoredBy_fkey"
  FOREIGN KEY ("restoredBy") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "BookingEntitlementAllocation_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE "PaymentRecoveryPolicy" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "target" "PaymentRecoveryTarget" NOT NULL,
  "mode" "PaymentRecoveryPolicyMode" DEFAULT 'ENABLED' NOT NULL,
  "name" text NOT NULL,
  "version" integer NOT NULL,
  "gracePeriodDays" integer DEFAULT 3 NOT NULL,
  "scheduleDays" integer[] DEFAULT '{0,3,7}' NOT NULL,
  "maxActions" integer DEFAULT 5 NOT NULL,
  "steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "isActive" boolean DEFAULT false NOT NULL,
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "PaymentRecoveryPolicy_version_check" CHECK ("version" > 0),
  CONSTRAINT "PaymentRecoveryPolicy_limits_check"
    CHECK ("gracePeriodDays" >= 0 AND "maxActions" BETWEEN 1 AND 20),
  CONSTRAINT "PaymentRecoveryPolicy_inherit_scope_check"
    CHECK ("mode" <> 'INHERIT' OR "locationId" IS NOT NULL)
);

CREATE UNIQUE INDEX "PaymentRecoveryPolicy_scope_target_version_key"
  ON "PaymentRecoveryPolicy" USING btree ("organizationId", "locationId", "target", "version");
CREATE UNIQUE INDEX "PaymentRecoveryPolicy_active_location_target_key"
  ON "PaymentRecoveryPolicy" USING btree ("organizationId", "locationId", "target")
  WHERE "isActive" = true AND "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "PaymentRecoveryPolicy_active_org_target_key"
  ON "PaymentRecoveryPolicy" USING btree ("organizationId", "target")
  WHERE "isActive" = true AND "locationId" IS NULL;
CREATE INDEX "PaymentRecoveryPolicy_scope_idx"
  ON "PaymentRecoveryPolicy" USING btree ("organizationId", "locationId");

ALTER TABLE "PaymentRecoveryPolicy"
  ADD CONSTRAINT "PaymentRecoveryPolicy_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryPolicy_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryPolicy_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE "PaymentRecoveryCase" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "clientId" text,
  "target" "PaymentRecoveryTarget" NOT NULL,
  "status" "PaymentRecoveryCaseStatus" DEFAULT 'OPEN' NOT NULL,
  "caseKey" text NOT NULL,
  "policyId" text,
  "policyVersion" integer,
  "policySnapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "invoiceId" text,
  "membershipId" text,
  "bookingId" text,
  "studioPaymentId" text,
  "commerceOperationId" text,
  "provider" text,
  "providerAccountId" text,
  "stripeConnectionId" text,
  "providerObjectId" text,
  "sourceEventId" text,
  "sourceEventAt" timestamp(3) NOT NULL,
  "amountMinor" bigint NOT NULL,
  "currency" text NOT NULL,
  "currencyExponent" integer DEFAULT 2 NOT NULL,
  "attemptCount" integer DEFAULT 0 NOT NULL,
  "nextActionAt" timestamp(3),
  "ownerUserId" text,
  "lastErrorCode" text,
  "lastErrorMessage" text,
  "openedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "recoveredAt" timestamp(3),
  "exhaustedAt" timestamp(3),
  "cancelledAt" timestamp(3),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "PaymentRecoveryCase_source_check"
    CHECK (num_nonnulls("invoiceId", "membershipId", "bookingId") = 1),
  CONSTRAINT "PaymentRecoveryCase_attempt_count_check" CHECK ("attemptCount" >= 0),
  CONSTRAINT "PaymentRecoveryCase_amount_check"
    CHECK ("amountMinor" >= 0 AND "currencyExponent" BETWEEN 0 AND 4),
  CONSTRAINT "PaymentRecoveryCase_stripe_binding_check"
    CHECK (upper(coalesce("provider", '')) <> 'STRIPE' OR ("stripeConnectionId" IS NOT NULL AND "providerAccountId" IS NOT NULL))
);

CREATE UNIQUE INDEX "PaymentRecoveryCase_caseKey_key"
  ON "PaymentRecoveryCase" USING btree ("caseKey");
CREATE INDEX "PaymentRecoveryCase_scope_status_nextActionAt_idx"
  ON "PaymentRecoveryCase" USING btree ("organizationId", "locationId", "status", "nextActionAt");
CREATE INDEX "PaymentRecoveryCase_clientId_openedAt_idx"
  ON "PaymentRecoveryCase" USING btree ("clientId", "openedAt" DESC);

ALTER TABLE "PaymentRecoveryCase"
  ADD CONSTRAINT "PaymentRecoveryCase_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryCase_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryCase_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "PaymentRecoveryCase_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "PaymentRecoveryPolicy"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "PaymentRecoveryCase_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryCase_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "StudioMembership"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryCase_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryCase_studioPaymentId_fkey"
  FOREIGN KEY ("studioPaymentId") REFERENCES "StudioPayment"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "PaymentRecoveryCase_commerceOperationId_fkey"
  FOREIGN KEY ("commerceOperationId") REFERENCES "CommerceOperation"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "PaymentRecoveryCase_providerAccountId_fkey"
  FOREIGN KEY ("providerAccountId") REFERENCES "ProviderAccount"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryCase_stripeConnectionId_fkey"
  FOREIGN KEY ("stripeConnectionId") REFERENCES "StripeConnection"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryCase_sourceEventId_fkey"
  FOREIGN KEY ("sourceEventId") REFERENCES "StripeEvent"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "PaymentRecoveryCase_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "InvoiceReminder"
  ADD CONSTRAINT "InvoiceReminder_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "PaymentRecoveryPolicy"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE "PaymentRecoveryAction" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "caseId" text NOT NULL,
  "type" "PaymentRecoveryActionType" NOT NULL,
  "status" "PaymentRecoveryActionStatus" DEFAULT 'SCHEDULED' NOT NULL,
  "sequence" integer NOT NULL,
  "idempotencyKey" text NOT NULL,
  "scheduledAt" timestamp(3) NOT NULL,
  "availableAt" timestamp(3) NOT NULL,
  "claimToken" text,
  "leaseExpiresAt" timestamp(3),
  "attemptCount" integer DEFAULT 0 NOT NULL,
  "maxAttempts" integer DEFAULT 5 NOT NULL,
  "providerAccountId" text,
  "stripeConnectionId" text,
  "outboundDeliveryId" text,
  "providerObjectId" text,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "cancelledAt" timestamp(3),
  "lastErrorCode" text,
  "lastErrorMessage" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "PaymentRecoveryAction_attempts_check"
    CHECK ("attemptCount" >= 0 AND "maxAttempts" BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX "PaymentRecoveryAction_idempotencyKey_key"
  ON "PaymentRecoveryAction" USING btree ("idempotencyKey");
CREATE UNIQUE INDEX "PaymentRecoveryAction_caseId_sequence_key"
  ON "PaymentRecoveryAction" USING btree ("caseId", "sequence");
CREATE INDEX "PaymentRecoveryAction_status_availableAt_idx"
  ON "PaymentRecoveryAction" USING btree ("status", "availableAt");
CREATE INDEX "PaymentRecoveryAction_leaseExpiresAt_idx"
  ON "PaymentRecoveryAction" USING btree ("leaseExpiresAt");

ALTER TABLE "PaymentRecoveryAction"
  ADD CONSTRAINT "PaymentRecoveryAction_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryAction_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryAction_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "PaymentRecoveryCase"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryAction_providerAccountId_fkey"
  FOREIGN KEY ("providerAccountId") REFERENCES "ProviderAccount"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryAction_stripeConnectionId_fkey"
  FOREIGN KEY ("stripeConnectionId") REFERENCES "StripeConnection"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryAction_outboundDeliveryId_fkey"
  FOREIGN KEY ("outboundDeliveryId") REFERENCES "OutboundDelivery"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE "PaymentRecoveryAttempt" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "caseId" text NOT NULL,
  "actionId" text,
  "type" "PaymentRecoveryAttemptType" NOT NULL,
  "status" "PaymentRecoveryAttemptStatus" NOT NULL,
  "idempotencyKey" text NOT NULL,
  "provider" text,
  "providerAccountId" text,
  "stripeConnectionId" text,
  "providerObjectId" text,
  "errorCode" text,
  "errorMessage" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurredAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX "PaymentRecoveryAttempt_idempotencyKey_key"
  ON "PaymentRecoveryAttempt" USING btree ("idempotencyKey");
CREATE INDEX "PaymentRecoveryAttempt_caseId_occurredAt_idx"
  ON "PaymentRecoveryAttempt" USING btree ("caseId", "occurredAt");

ALTER TABLE "PaymentRecoveryAttempt"
  ADD CONSTRAINT "PaymentRecoveryAttempt_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryAttempt_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryAttempt_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "PaymentRecoveryCase"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryAttempt_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "PaymentRecoveryAction"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT "PaymentRecoveryAttempt_providerAccountId_fkey"
  FOREIGN KEY ("providerAccountId") REFERENCES "ProviderAccount"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT "PaymentRecoveryAttempt_stripeConnectionId_fkey"
  FOREIGN KEY ("stripeConnectionId") REFERENCES "StripeConnection"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE "PaymentRecoveryLink" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "caseId" text NOT NULL,
  "tokenHash" text NOT NULL,
  "purpose" text NOT NULL,
  "expiresAt" timestamp(3) NOT NULL,
  "usedAt" timestamp(3),
  "revokedAt" timestamp(3),
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "PaymentRecoveryLink_purpose_check" CHECK ("purpose" IN ('UPDATE_PAYMENT', 'RETRY_CHECKOUT'))
);

CREATE UNIQUE INDEX "PaymentRecoveryLink_tokenHash_key"
  ON "PaymentRecoveryLink" USING btree ("tokenHash");
CREATE INDEX "PaymentRecoveryLink_caseId_expiresAt_idx"
  ON "PaymentRecoveryLink" USING btree ("caseId", "expiresAt");

ALTER TABLE "PaymentRecoveryLink"
  ADD CONSTRAINT "PaymentRecoveryLink_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryLink_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryLink_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "PaymentRecoveryCase"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRecoveryLink_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION validate_booking_entitlement_allocation_scope()
RETURNS trigger AS $$
DECLARE
  booking_org text;
  booking_location text;
  booking_client text;
  membership_org text;
  membership_location text;
  credit_membership text;
BEGIN
  SELECT class."organizationId", class."locationId", selected_booking."clientId"
  INTO booking_org, booking_location, booking_client
  FROM "StudioBooking" selected_booking
  JOIN "StudioClass" class ON class."id" = selected_booking."classId"
  WHERE selected_booking."id" = NEW."bookingId";

  IF booking_org IS NULL
     OR booking_org IS DISTINCT FROM NEW."organizationId"
     OR booking_location IS DISTINCT FROM NEW."locationId"
     OR booking_client IS DISTINCT FROM NEW."clientId" THEN
    RAISE EXCEPTION 'Booking entitlement allocation scope mismatch';
  END IF;

  IF NEW."membershipId" IS NOT NULL THEN
    SELECT membership."organizationId", membership."locationId"
    INTO membership_org, membership_location
    FROM "StudioMembership" membership
    WHERE membership."id" = NEW."membershipId" AND membership."clientId" = NEW."clientId";
    IF membership_org IS DISTINCT FROM NEW."organizationId"
       OR membership_location IS DISTINCT FROM NEW."locationId" THEN
      RAISE EXCEPTION 'Booking entitlement membership scope mismatch';
    END IF;
  END IF;

  IF NEW."classCreditId" IS NOT NULL THEN
    SELECT credit."membershipId" INTO credit_membership
    FROM "ClassCredit" credit
    WHERE credit."id" = NEW."classCreditId"
      AND credit."organizationId" = NEW."organizationId"
      AND credit."locationId" IS NOT DISTINCT FROM NEW."locationId"
      AND credit."clientId" = NEW."clientId";
    IF credit_membership IS NULL OR credit_membership IS DISTINCT FROM NEW."membershipId" THEN
      RAISE EXCEPTION 'Booking entitlement credit scope mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BookingEntitlementAllocation_validate_scope"
BEFORE INSERT OR UPDATE ON "BookingEntitlementAllocation"
FOR EACH ROW EXECUTE FUNCTION validate_booking_entitlement_allocation_scope();

CREATE OR REPLACE FUNCTION validate_payment_recovery_case_scope()
RETURNS trigger AS $$
DECLARE
  source_org text;
  source_location text;
  source_client text;
  connection_account text;
BEGIN
  IF NEW."target" = 'INVOICE' THEN
    SELECT "organizationId", "locationId", "clientId" INTO source_org, source_location, source_client
    FROM "Invoice" WHERE "id" = NEW."invoiceId";
  ELSIF NEW."target" = 'MEMBERSHIP' THEN
    SELECT "organizationId", "locationId", "clientId" INTO source_org, source_location, source_client
    FROM "StudioMembership" WHERE "id" = NEW."membershipId";
  ELSIF NEW."target" = 'BOOKING' THEN
    SELECT "organizationId", "locationId", "clientId" INTO source_org, source_location, source_client
    FROM "Booking" WHERE "id" = NEW."bookingId";
  END IF;

  IF source_org IS NULL
     OR source_org IS DISTINCT FROM NEW."organizationId"
     OR source_location IS DISTINCT FROM NEW."locationId"
     OR (NEW."clientId" IS NOT NULL AND source_client IS DISTINCT FROM NEW."clientId") THEN
    RAISE EXCEPTION 'Payment recovery source scope mismatch';
  END IF;

  IF NEW."stripeConnectionId" IS NOT NULL THEN
    SELECT connection."stripeAccountId" INTO connection_account
    FROM "StripeConnection" connection
    WHERE connection."id" = NEW."stripeConnectionId"
      AND connection."organizationId" = NEW."organizationId"
      AND connection."locationId" IS NOT DISTINCT FROM NEW."locationId";
    IF connection_account IS NULL OR connection_account IS DISTINCT FROM NEW."providerAccountId" THEN
      RAISE EXCEPTION 'Payment recovery Stripe binding mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PaymentRecoveryCase_validate_scope"
BEFORE INSERT OR UPDATE ON "PaymentRecoveryCase"
FOR EACH ROW EXECUTE FUNCTION validate_payment_recovery_case_scope();

CREATE OR REPLACE FUNCTION validate_payment_recovery_child_scope()
RETURNS trigger AS $$
DECLARE
  parent_org text;
  parent_location text;
BEGIN
  SELECT "organizationId", "locationId" INTO parent_org, parent_location
  FROM "PaymentRecoveryCase" WHERE "id" = NEW."caseId";
  IF parent_org IS NULL
     OR parent_org IS DISTINCT FROM NEW."organizationId"
     OR parent_location IS DISTINCT FROM NEW."locationId" THEN
    RAISE EXCEPTION 'Payment recovery child scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PaymentRecoveryAction_validate_scope"
BEFORE INSERT OR UPDATE ON "PaymentRecoveryAction"
FOR EACH ROW EXECUTE FUNCTION validate_payment_recovery_child_scope();
CREATE TRIGGER "PaymentRecoveryAttempt_validate_scope"
BEFORE INSERT OR UPDATE ON "PaymentRecoveryAttempt"
FOR EACH ROW EXECUTE FUNCTION validate_payment_recovery_child_scope();
CREATE TRIGGER "PaymentRecoveryLink_validate_scope"
BEFORE INSERT OR UPDATE ON "PaymentRecoveryLink"
FOR EACH ROW EXECUTE FUNCTION validate_payment_recovery_child_scope();

ALTER TABLE "BookingEntitlementAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentRecoveryPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentRecoveryCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentRecoveryAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentRecoveryAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentRecoveryLink" ENABLE ROW LEVEL SECURITY;
