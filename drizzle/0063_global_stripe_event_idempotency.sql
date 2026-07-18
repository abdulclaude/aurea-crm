DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT count(*)::integer
  INTO duplicate_count
  FROM (
    SELECT "stripeEventId"
    FROM "StripeEvent"
    GROUP BY "stripeEventId"
    HAVING count(*) > 1
  ) AS duplicate_events;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce global Stripe event idempotency: % duplicate event identifiers require reconciliation',
      duplicate_count;
  END IF;
END $$;

DROP INDEX IF EXISTS "StripeEvent_stripeEventId_source_key";
CREATE UNIQUE INDEX "StripeEvent_stripeEventId_key"
  ON "StripeEvent" USING btree ("stripeEventId");
