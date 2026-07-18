CREATE TYPE "public"."CancellationChargeStatus" AS ENUM (
  'PENDING',
  'REQUIRES_PAYMENT_METHOD',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'NO_PAYMENT_DUE',
  'WAIVED'
);

ALTER TYPE "public"."CommerceOperationType" ADD VALUE IF NOT EXISTS 'PAYMENT';

ALTER TABLE "CancellationCharge"
  ADD COLUMN "locationId" text,
  ADD COLUMN "policyId" text,
  ADD COLUMN "status" "CancellationChargeStatus" DEFAULT 'PENDING' NOT NULL,
  ADD COLUMN "stripeConnectionId" text,
  ADD COLUMN "commerceOperationId" text,
  ADD COLUMN "stripePaymentIntentId" text,
  ADD COLUMN "collectionAttempt" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "failureCode" text,
  ADD COLUMN "failureMessage" text,
  ADD COLUMN "processedAt" timestamp(3),
  ADD COLUMN "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;

UPDATE "CancellationCharge" AS charge
SET
  "locationId" = class."locationId",
  "policyId" = COALESCE(
    class."cancellationPolicyId",
    (
      SELECT policy."id"
      FROM "CancellationPolicy" AS policy
      WHERE policy."organizationId" = charge."organizationId"
        AND policy."locationId" IS NOT DISTINCT FROM class."locationId"
        AND policy."isDefault" = true
        AND policy."isActive" = true
      ORDER BY policy."createdAt" DESC, policy."id" ASC
      LIMIT 1
    )
  ),
  "status" = CASE
    WHEN charge."waived" = true THEN 'WAIVED'::"CancellationChargeStatus"
    WHEN charge."stripeChargeId" IS NOT NULL THEN 'SUCCEEDED'::"CancellationChargeStatus"
    WHEN charge."amount" = 0 THEN 'NO_PAYMENT_DUE'::"CancellationChargeStatus"
    ELSE 'PENDING'::"CancellationChargeStatus"
  END,
  "processedAt" = CASE
    WHEN charge."waived" = true OR charge."stripeChargeId" IS NOT NULL OR charge."amount" = 0
      THEN charge."createdAt"
    ELSE NULL
  END,
  "updatedAt" = charge."createdAt"
FROM "StudioClass" AS class
WHERE charge."classId" = class."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CancellationCharge" AS charge
    LEFT JOIN "StudioClass" AS class ON class."id" = charge."classId"
    LEFT JOIN "StudioBooking" AS booking ON booking."id" = charge."bookingId"
    LEFT JOIN "Client" AS client ON client."id" = charge."clientId"
    WHERE class."id" IS NULL
      OR booking."id" IS NULL
      OR client."id" IS NULL
      OR class."organizationId" <> charge."organizationId"
      OR class."locationId" IS DISTINCT FROM charge."locationId"
      OR booking."classId" <> charge."classId"
      OR booking."clientId" <> charge."clientId"
      OR client."organizationId" <> charge."organizationId"
      OR client."locationId" IS DISTINCT FROM charge."locationId"
  ) THEN
    RAISE EXCEPTION 'CancellationCharge contains records outside their booking workspace scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CancellationCharge"
    GROUP BY "bookingId", "type"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'CancellationCharge contains duplicate booking fee types';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CancellationPolicy"
    WHERE "isDefault" = true AND "isActive" = true
    GROUP BY "organizationId", "locationId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'CancellationPolicy contains multiple active defaults in one workspace scope';
  END IF;
END $$;

CREATE UNIQUE INDEX "CancellationCharge_bookingId_type_key"
  ON "CancellationCharge" USING btree ("bookingId", "type");
CREATE INDEX "CancellationCharge_scope_status_idx"
  ON "CancellationCharge" USING btree ("organizationId", "locationId", "status", "createdAt" DESC);
CREATE UNIQUE INDEX "CancellationCharge_commerceOperationId_key"
  ON "CancellationCharge" USING btree ("commerceOperationId")
  WHERE "commerceOperationId" IS NOT NULL;
CREATE UNIQUE INDEX "CancellationPolicy_active_default_location_key"
  ON "CancellationPolicy" USING btree ("organizationId", "locationId")
  WHERE "isDefault" = true AND "isActive" = true AND "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "CancellationPolicy_active_default_organization_key"
  ON "CancellationPolicy" USING btree ("organizationId")
  WHERE "isDefault" = true AND "isActive" = true AND "locationId" IS NULL;

ALTER TABLE "CancellationCharge"
  ADD CONSTRAINT "CancellationCharge_amount_nonnegative_check"
    CHECK ("amount" >= 0),
  ADD CONSTRAINT "CancellationCharge_credits_nonnegative_check"
    CHECK ("creditsDeducted" >= 0),
  ADD CONSTRAINT "CancellationCharge_collection_attempt_nonnegative_check"
    CHECK ("collectionAttempt" >= 0),
  ADD CONSTRAINT "CancellationCharge_waiver_state_check"
    CHECK (("status" = 'WAIVED') = "waived"),
  ADD CONSTRAINT "CancellationCharge_no_payment_due_check"
    CHECK ("status" <> 'NO_PAYMENT_DUE' OR "amount" = 0),
  ADD CONSTRAINT "CancellationCharge_processing_binding_check"
    CHECK (
      "status" <> 'PROCESSING'
      OR (
        "stripeConnectionId" IS NOT NULL
        AND "commerceOperationId" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "CancellationCharge_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CancellationCharge_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId")
    REFERENCES "public"."Location"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CancellationCharge_scope_client_fkey"
    FOREIGN KEY ("organizationId", "clientId")
    REFERENCES "public"."Client"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CancellationCharge_scope_class_fkey"
    FOREIGN KEY ("organizationId", "classId")
    REFERENCES "public"."StudioClass"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CancellationCharge_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "public"."StudioBooking"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CancellationCharge_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "public"."CancellationPolicy"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CancellationCharge_stripeConnectionId_fkey"
    FOREIGN KEY ("stripeConnectionId") REFERENCES "public"."StripeConnection"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CancellationCharge_commerceOperationId_fkey"
    FOREIGN KEY ("commerceOperationId") REFERENCES "public"."CommerceOperation"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CancellationCreditAllocation" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "cancellationChargeId" text NOT NULL,
  "classCreditId" text NOT NULL,
  "credits" integer NOT NULL,
  "reversedAt" timestamp(3),
  "reversedBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "CancellationCreditAllocation_credits_positive_check"
    CHECK ("credits" > 0),
  CONSTRAINT "CancellationCreditAllocation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CancellationCreditAllocation_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId")
    REFERENCES "public"."Location"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CancellationCreditAllocation_chargeId_fkey"
    FOREIGN KEY ("cancellationChargeId") REFERENCES "public"."CancellationCharge"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CancellationCreditAllocation_classCreditId_fkey"
    FOREIGN KEY ("classCreditId") REFERENCES "public"."ClassCredit"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CancellationCreditAllocation_charge_credit_key"
  ON "CancellationCreditAllocation" USING btree ("cancellationChargeId", "classCreditId");
CREATE INDEX "CancellationCreditAllocation_scope_idx"
  ON "CancellationCreditAllocation" USING btree (
    "organizationId", "locationId", "createdAt" DESC
  );
ALTER TABLE "CancellationCreditAllocation" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION "validate_cancellation_credit_allocation_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  charge_scope record;
  credit_scope record;
BEGIN
  SELECT "organizationId", "locationId"
  INTO charge_scope
  FROM "CancellationCharge"
  WHERE "id" = NEW."cancellationChargeId";

  SELECT "organizationId", "locationId"
  INTO credit_scope
  FROM "ClassCredit"
  WHERE "id" = NEW."classCreditId";

  IF charge_scope."organizationId" IS NULL
    OR credit_scope."organizationId" IS NULL
    OR charge_scope."organizationId" <> NEW."organizationId"
    OR charge_scope."locationId" IS DISTINCT FROM NEW."locationId"
    OR credit_scope."organizationId" <> NEW."organizationId"
    OR credit_scope."locationId" IS DISTINCT FROM NEW."locationId"
  THEN
    RAISE EXCEPTION 'Cancellation credit allocation does not belong to the recorded workspace scope';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "CancellationCreditAllocation_validate_scope"
BEFORE INSERT OR UPDATE ON "CancellationCreditAllocation"
FOR EACH ROW EXECUTE FUNCTION "validate_cancellation_credit_allocation_scope"();

CREATE OR REPLACE FUNCTION "validate_cancellation_charge_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booking_scope record;
  policy_scope record;
  connection_scope record;
  operation_scope record;
BEGIN
  SELECT
    class."organizationId",
    class."locationId",
    booking."classId",
    booking."clientId"
  INTO booking_scope
  FROM "StudioBooking" AS booking
  JOIN "StudioClass" AS class ON class."id" = booking."classId"
  JOIN "Client" AS client ON client."id" = booking."clientId"
  WHERE booking."id" = NEW."bookingId"
    AND booking."classId" = NEW."classId"
    AND booking."clientId" = NEW."clientId"
    AND client."organizationId" = class."organizationId"
    AND client."locationId" IS NOT DISTINCT FROM class."locationId";

  IF NOT FOUND
    OR booking_scope."organizationId" <> NEW."organizationId"
    OR booking_scope."locationId" IS DISTINCT FROM NEW."locationId"
  THEN
    RAISE EXCEPTION 'Cancellation charge booking does not belong to the recorded workspace scope';
  END IF;

  IF NEW."policyId" IS NOT NULL THEN
    SELECT "organizationId", "locationId"
    INTO policy_scope
    FROM "CancellationPolicy"
    WHERE "id" = NEW."policyId";

    IF NOT FOUND
      OR policy_scope."organizationId" <> NEW."organizationId"
      OR policy_scope."locationId" IS DISTINCT FROM NEW."locationId"
    THEN
      RAISE EXCEPTION 'Cancellation charge policy does not belong to the recorded workspace scope';
    END IF;
  END IF;

  IF NEW."stripeConnectionId" IS NOT NULL THEN
    SELECT "organizationId", "locationId"
    INTO connection_scope
    FROM "StripeConnection"
    WHERE "id" = NEW."stripeConnectionId";

    IF NOT FOUND
      OR connection_scope."organizationId" <> NEW."organizationId"
      OR connection_scope."locationId" IS DISTINCT FROM NEW."locationId"
    THEN
      RAISE EXCEPTION 'Cancellation charge Stripe connection does not belong to the recorded workspace scope';
    END IF;
  END IF;

  IF NEW."commerceOperationId" IS NOT NULL THEN
    SELECT *
    INTO operation_scope
    FROM "CommerceOperation"
    WHERE "id" = NEW."commerceOperationId";

    IF NOT FOUND
      OR operation_scope."organizationId" <> NEW."organizationId"
      OR operation_scope."locationId" IS DISTINCT FROM NEW."locationId"
      OR operation_scope."clientId" IS DISTINCT FROM NEW."clientId"
      OR operation_scope."studioBookingId" IS DISTINCT FROM NEW."bookingId"
      OR operation_scope."stripeConnectionId" IS DISTINCT FROM NEW."stripeConnectionId"
      OR operation_scope."currency" <> upper(NEW."currency")
    THEN
      RAISE EXCEPTION 'Cancellation charge commerce operation does not match the fee scope';
    END IF;

    IF NEW."stripePaymentIntentId" IS NOT NULL
      AND operation_scope."providerPaymentIntentId" IS DISTINCT FROM NEW."stripePaymentIntentId"
    THEN
      RAISE EXCEPTION 'Cancellation charge payment intent does not match its commerce operation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "CancellationCharge_validate_scope"
BEFORE INSERT OR UPDATE ON "CancellationCharge"
FOR EACH ROW EXECUTE FUNCTION "validate_cancellation_charge_scope"();
