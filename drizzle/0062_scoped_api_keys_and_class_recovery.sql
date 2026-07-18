ALTER TABLE "ApiKey"
  ADD COLUMN "locationId" text;

UPDATE "ApiKey" key
SET "locationId" = single_location."id"
FROM (
  SELECT "organizationId", min("id") AS "id"
  FROM "Location"
  GROUP BY "organizationId"
  HAVING count(*) = 1
) single_location
WHERE single_location."organizationId" = key."organizationId";

CREATE INDEX "ApiKey_scope_idx"
  ON "ApiKey" USING btree ("organizationId", "locationId");

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_scope_location_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "Location"("organizationId", "id")
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "PaymentRecoveryCase"
  ADD COLUMN "studioBookingId" text;

ALTER TABLE "PaymentRecoveryCase"
  DROP CONSTRAINT "PaymentRecoveryCase_source_check";
ALTER TABLE "PaymentRecoveryCase"
  ADD CONSTRAINT "PaymentRecoveryCase_source_check"
  CHECK (num_nonnulls("invoiceId", "membershipId", "bookingId", "studioBookingId") = 1);

ALTER TABLE "PaymentRecoveryCase"
  ADD CONSTRAINT "PaymentRecoveryCase_studioBookingId_fkey"
  FOREIGN KEY ("studioBookingId") REFERENCES "StudioBooking"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION validate_payment_recovery_case_scope()
RETURNS trigger AS $$
DECLARE
  source_org text;
  source_location text;
  source_client text;
  connection_account text;
BEGIN
  IF NEW."target" = 'INVOICE' THEN
    SELECT "organizationId", "locationId", "clientId"
    INTO source_org, source_location, source_client
    FROM "Invoice" WHERE "id" = NEW."invoiceId";
  ELSIF NEW."target" = 'MEMBERSHIP' THEN
    SELECT "organizationId", "locationId", "clientId"
    INTO source_org, source_location, source_client
    FROM "StudioMembership" WHERE "id" = NEW."membershipId";
  ELSIF NEW."target" = 'BOOKING' AND NEW."studioBookingId" IS NOT NULL THEN
    SELECT selected_class."organizationId", selected_class."locationId", selected_booking."clientId"
    INTO source_org, source_location, source_client
    FROM "StudioBooking" selected_booking
    JOIN "StudioClass" selected_class ON selected_class."id" = selected_booking."classId"
    WHERE selected_booking."id" = NEW."studioBookingId";
  ELSIF NEW."target" = 'BOOKING' THEN
    SELECT "organizationId", "locationId", "clientId"
    INTO source_org, source_location, source_client
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
    IF connection_account IS NULL OR connection_account IS DISTINCT FROM NEW."providerAccountRef" THEN
      RAISE EXCEPTION 'Payment recovery Stripe binding mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
