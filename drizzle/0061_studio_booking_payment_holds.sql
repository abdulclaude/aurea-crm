ALTER TABLE "StudioBooking"
  ADD COLUMN "paymentStatus" "BookingPaymentStatus" DEFAULT 'NOT_REQUIRED' NOT NULL,
  ADD COLUMN "paymentId" text,
  ADD COLUMN "amount" numeric(10, 2),
  ADD COLUMN "currency" text,
  ADD COLUMN "holdExpiresAt" timestamp(3),
  ADD COLUMN "paymentRequiredAt" timestamp(3),
  ADD COLUMN "paymentFailureAt" timestamp(3),
  ADD COLUMN "confirmedAt" timestamp(3),
  ADD COLUMN "releasedAt" timestamp(3);

UPDATE "StudioBooking"
SET "confirmedAt" = "bookedAt"
WHERE "status" IN ('BOOKED', 'ATTENDED');

CREATE INDEX "StudioBooking_paymentStatus_holdExpiresAt_idx"
  ON "StudioBooking" USING btree ("paymentStatus", "holdExpiresAt");

CREATE UNIQUE INDEX "CommerceOperation_active_studio_booking_checkout_key"
  ON "CommerceOperation" USING btree ("studioBookingId")
  WHERE "studioBookingId" IS NOT NULL
    AND "type" = 'CHECKOUT'
    AND "status" IN ('CREATED', 'PROVIDER_PENDING', 'REQUIRES_ACTION');

CREATE OR REPLACE FUNCTION validate_commerce_operation_studio_booking_scope()
RETURNS trigger AS $$
DECLARE
  booking_org text;
  booking_location text;
BEGIN
  IF NEW."studioBookingId" IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT class."organizationId", class."locationId"
  INTO booking_org, booking_location
  FROM "StudioBooking" selected_booking
  JOIN "StudioClass" class ON class."id" = selected_booking."classId"
  WHERE selected_booking."id" = NEW."studioBookingId";
  IF booking_org IS NULL
     OR booking_org IS DISTINCT FROM NEW."organizationId"
     OR booking_location IS DISTINCT FROM NEW."locationId" THEN
    RAISE EXCEPTION 'Commerce operation studio booking scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CommerceOperation_validate_studio_booking_scope"
BEFORE INSERT OR UPDATE ON "CommerceOperation"
FOR EACH ROW EXECUTE FUNCTION validate_commerce_operation_studio_booking_scope();
