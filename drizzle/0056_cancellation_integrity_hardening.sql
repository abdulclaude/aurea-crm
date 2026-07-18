DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CancellationPolicy" AS policy
    JOIN "Location" AS location ON location."id" = policy."locationId"
    WHERE policy."locationId" IS NOT NULL
      AND location."organizationId" <> policy."organizationId"
  ) THEN
    RAISE EXCEPTION 'CancellationPolicy contains cross-organization location references';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudioClass" AS class
    JOIN "CancellationPolicy" AS policy ON policy."id" = class."cancellationPolicyId"
    WHERE class."cancellationPolicyId" IS NOT NULL
      AND (
        policy."organizationId" <> class."organizationId"
        OR policy."locationId" IS DISTINCT FROM class."locationId"
      )
  ) THEN
    RAISE EXCEPTION 'StudioClass contains cancellation policies outside its workspace scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CancellationCharge" AS charge
    JOIN "CancellationPolicy" AS policy ON policy."id" = charge."policyId"
    WHERE charge."policyId" IS NOT NULL
      AND (
        policy."organizationId" <> charge."organizationId"
        OR policy."locationId" IS DISTINCT FROM charge."locationId"
      )
  ) THEN
    RAISE EXCEPTION 'CancellationCharge contains policies outside its workspace scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CancellationCreditAllocation" AS allocation
    JOIN "CancellationCharge" AS charge ON charge."id" = allocation."cancellationChargeId"
    JOIN "ClassCredit" AS credit ON credit."id" = allocation."classCreditId"
    WHERE credit."clientId" <> charge."clientId"
  ) THEN
    RAISE EXCEPTION 'CancellationCreditAllocation contains credits owned by another member';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CancellationCharge" AS charge
    JOIN "CommerceOperation" AS operation ON operation."id" = charge."commerceOperationId"
    JOIN "StripeConnection" AS connection ON connection."id" = charge."stripeConnectionId"
    WHERE charge."commerceOperationId" IS NOT NULL
      AND (
        operation."type" <> 'PAYMENT'
        OR operation."provider" <> 'STRIPE'
        OR operation."providerAccountId" <> connection."stripeAccountId"
        OR operation."amountMinor"::numeric <> charge."amount" * power(10::numeric, operation."currencyExponent")
        OR operation."currencyExponent" < 0
        OR operation."currencyExponent" > 6
      )
  ) THEN
    RAISE EXCEPTION 'CancellationCharge contains an invalid payment operation binding';
  END IF;
END $$;

ALTER TABLE "CancellationPolicy"
  DROP CONSTRAINT IF EXISTS "CancellationPolicy_locationId_fkey",
  ADD CONSTRAINT "CancellationPolicy_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId")
    REFERENCES "public"."Location"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "validate_studio_class_cancellation_policy_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  policy_scope record;
BEGIN
  IF NEW."cancellationPolicyId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "organizationId", "locationId"
  INTO policy_scope
  FROM "CancellationPolicy"
  WHERE "id" = NEW."cancellationPolicyId";

  IF NOT FOUND
    OR policy_scope."organizationId" <> NEW."organizationId"
    OR policy_scope."locationId" IS DISTINCT FROM NEW."locationId"
  THEN
    RAISE EXCEPTION 'Studio class cancellation policy does not belong to its workspace scope';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "StudioClass_validate_cancellation_policy_scope"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "cancellationPolicyId"
ON "StudioClass"
FOR EACH ROW EXECUTE FUNCTION "validate_studio_class_cancellation_policy_scope"();

CREATE OR REPLACE FUNCTION "validate_cancellation_credit_allocation_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  charge_scope record;
  credit_scope record;
BEGIN
  SELECT "organizationId", "locationId", "clientId"
  INTO charge_scope
  FROM "CancellationCharge"
  WHERE "id" = NEW."cancellationChargeId";

  SELECT "organizationId", "locationId", "clientId"
  INTO credit_scope
  FROM "ClassCredit"
  WHERE "id" = NEW."classCreditId";

  IF charge_scope."organizationId" IS NULL
    OR credit_scope."organizationId" IS NULL
    OR charge_scope."organizationId" <> NEW."organizationId"
    OR charge_scope."locationId" IS DISTINCT FROM NEW."locationId"
    OR credit_scope."organizationId" <> NEW."organizationId"
    OR credit_scope."locationId" IS DISTINCT FROM NEW."locationId"
    OR credit_scope."clientId" <> charge_scope."clientId"
  THEN
    RAISE EXCEPTION 'Cancellation credit allocation does not match the fee member and workspace scope';
  END IF;

  RETURN NEW;
END;
$$;

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
    SELECT "organizationId", "locationId", "stripeAccountId"
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
      OR operation_scope."providerAccountId" IS DISTINCT FROM connection_scope."stripeAccountId"
      OR operation_scope."type" <> 'PAYMENT'
      OR operation_scope."provider" <> 'STRIPE'
      OR operation_scope."currency" <> upper(NEW."currency")
      OR operation_scope."currencyExponent" < 0
      OR operation_scope."currencyExponent" > 6
      OR operation_scope."amountMinor"::numeric <> NEW."amount" * power(10::numeric, operation_scope."currencyExponent")
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
