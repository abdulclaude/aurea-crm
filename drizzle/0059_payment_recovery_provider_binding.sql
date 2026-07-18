ALTER TABLE "PaymentRecoveryCase"
  ADD COLUMN "providerAccountRef" text;
ALTER TABLE "PaymentRecoveryAction"
  ADD COLUMN "providerAccountRef" text;
ALTER TABLE "PaymentRecoveryAttempt"
  ADD COLUMN "providerAccountRef" text;

ALTER TABLE "PaymentRecoveryCase"
  DROP CONSTRAINT "PaymentRecoveryCase_stripe_binding_check";
ALTER TABLE "PaymentRecoveryCase"
  ADD CONSTRAINT "PaymentRecoveryCase_stripe_binding_check"
  CHECK (
    upper(coalesce("provider", '')) <> 'STRIPE'
    OR ("stripeConnectionId" IS NOT NULL AND "providerAccountRef" IS NOT NULL)
  );

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
    IF connection_account IS NULL OR connection_account IS DISTINCT FROM NEW."providerAccountRef" THEN
      RAISE EXCEPTION 'Payment recovery Stripe binding mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

INSERT INTO "PaymentRecoveryPolicy" (
  "id", "organizationId", "locationId", "target", "mode", "name", "version",
  "gracePeriodDays", "scheduleDays", "maxActions", "steps", "isActive", "createdAt", "updatedAt"
)
SELECT
  'recovery_' || md5(org."id" || ':' || template.target::text),
  org."id",
  NULL,
  template.target,
  'ENABLED',
  template.name,
  1,
  template.grace_days,
  template.schedule_days,
  template.max_actions,
  template.steps,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" org
CROSS JOIN (
  VALUES
    (
      'INVOICE'::"PaymentRecoveryTarget",
      'Invoice payment recovery',
      0,
      ARRAY[0, 7, 14, 30]::integer[],
      5,
      '[{"type":"SEND_EMAIL"},{"type":"SEND_EMAIL"},{"type":"SEND_EMAIL"},{"type":"ESCALATE"}]'::jsonb
    ),
    (
      'MEMBERSHIP'::"PaymentRecoveryTarget",
      'Membership payment recovery',
      3,
      ARRAY[0, 3, 7, 14]::integer[],
      5,
      '[{"type":"SEND_EMAIL"},{"type":"SEND_EMAIL"},{"type":"CREATE_TASK"},{"type":"ESCALATE"}]'::jsonb
    ),
    (
      'BOOKING'::"PaymentRecoveryTarget",
      'Booking payment recovery',
      0,
      ARRAY[0, 1, 3]::integer[],
      4,
      '[{"type":"SEND_EMAIL"},{"type":"SEND_EMAIL"},{"type":"ESCALATE"}]'::jsonb
    )
) AS template(target, name, grace_days, schedule_days, max_actions, steps)
ON CONFLICT DO NOTHING;
