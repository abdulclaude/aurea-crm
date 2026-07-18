ALTER TABLE "CommerceOperation" ADD COLUMN "stripeConnectionId" text;
ALTER TABLE "CommerceLedgerEntry" ADD COLUMN "stripeConnectionId" text;
ALTER TABLE "CommerceLedgerEntry" ADD COLUMN "instructorId" text;
ALTER TABLE "StudioPayment" ADD COLUMN "stripeConnectionId" text;
ALTER TABLE "StudioMembership" ADD COLUMN "stripeConnectionId" text;
ALTER TABLE "MembershipPlan" ADD COLUMN "stripeConnectionId" text;
ALTER TABLE "StripeEvent" ADD COLUMN "stripeConnectionId" text;
ALTER TABLE "StripeEvent" ADD COLUMN "instructorId" text;
--> statement-breakpoint

DROP INDEX IF EXISTS "StripeConnection_organizationId_locationId_key";
DROP INDEX IF EXISTS "StripeConnection_organization_default_key";
DROP INDEX IF EXISTS "StripeConnection_locationId_key";
CREATE UNIQUE INDEX "StripeConnection_active_location_scope_key"
  ON "StripeConnection" USING btree ("organizationId", "locationId")
  WHERE "isActive" = true AND "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "StripeConnection_active_organization_scope_key"
  ON "StripeConnection" USING btree ("organizationId")
  WHERE "isActive" = true AND "locationId" IS NULL;
CREATE UNIQUE INDEX "StripeConnection_organizationId_id_key"
  ON "StripeConnection" USING btree ("organizationId", "id");
CREATE UNIQUE INDEX "StripeConnection_scope_id_key"
  ON "StripeConnection" USING btree ("organizationId", "locationId", "id");
DROP INDEX IF EXISTS "StripeEvent_stripeEventId_key";
CREATE UNIQUE INDEX "StripeEvent_stripeEventId_source_key"
  ON "StripeEvent" USING btree ("stripeEventId", "source");
--> statement-breakpoint

UPDATE "CommerceOperation" AS operation
SET "stripeConnectionId" = connection."id"
FROM "StripeConnection" AS connection
WHERE operation."provider" = 'STRIPE'
  AND operation."providerAccountId" = connection."stripeAccountId"
  AND operation."organizationId" = connection."organizationId"
  AND operation."locationId" IS NOT DISTINCT FROM connection."locationId";

UPDATE "CommerceLedgerEntry" AS ledger
SET "stripeConnectionId" = connection."id"
FROM "StripeConnection" AS connection
WHERE ledger."provider" = 'STRIPE'
  AND ledger."providerAccountId" = connection."stripeAccountId"
  AND ledger."organizationId" = connection."organizationId"
  AND ledger."locationId" IS NOT DISTINCT FROM connection."locationId";

UPDATE "CommerceLedgerEntry" AS ledger
SET "stripeConnectionId" = operation."stripeConnectionId"
FROM "CommerceOperation" AS operation
WHERE ledger."stripeConnectionId" IS NULL
  AND ledger."operationId" = operation."id"
  AND operation."stripeConnectionId" IS NOT NULL
  AND ledger."organizationId" = operation."organizationId"
  AND ledger."locationId" IS NOT DISTINCT FROM operation."locationId";

UPDATE "CommerceLedgerEntry" AS ledger
SET "providerAccountId" = connection."stripeAccountId"
FROM "StripeConnection" AS connection
WHERE ledger."stripeConnectionId" = connection."id"
  AND ledger."providerAccountId" IS NULL;
--> statement-breakpoint

WITH payment_candidates AS (
  SELECT candidate."studioPaymentId" AS id,
    min(candidate."stripeConnectionId") AS "stripeConnectionId"
  FROM (
    SELECT ledger."studioPaymentId", ledger."stripeConnectionId"
    FROM "CommerceLedgerEntry" AS ledger
    WHERE ledger."studioPaymentId" IS NOT NULL
      AND ledger."stripeConnectionId" IS NOT NULL
    UNION ALL
    SELECT operation."studioPaymentId", operation."stripeConnectionId"
    FROM "CommerceOperation" AS operation
    WHERE operation."studioPaymentId" IS NOT NULL
      AND operation."stripeConnectionId" IS NOT NULL
    UNION ALL
    SELECT payment."id", ledger."stripeConnectionId"
    FROM "StudioPayment" AS payment
    INNER JOIN "CommerceLedgerEntry" AS ledger
      ON ledger."paymentIntentId" = payment."stripePaymentIntentId"
      AND ledger."organizationId" = payment."organizationId"
      AND ledger."locationId" IS NOT DISTINCT FROM payment."locationId"
    WHERE payment."stripePaymentIntentId" IS NOT NULL
      AND ledger."stripeConnectionId" IS NOT NULL
  ) AS candidate
  GROUP BY candidate."studioPaymentId"
  HAVING count(DISTINCT candidate."stripeConnectionId") = 1
)
UPDATE "StudioPayment" AS payment
SET "stripeConnectionId" = candidate."stripeConnectionId"
FROM payment_candidates AS candidate
WHERE payment."id" = candidate.id;

WITH membership_candidates AS (
  SELECT candidate."membershipId" AS id,
    min(candidate."stripeConnectionId") AS "stripeConnectionId"
  FROM (
    SELECT ledger."membershipId", ledger."stripeConnectionId"
    FROM "CommerceLedgerEntry" AS ledger
    WHERE ledger."membershipId" IS NOT NULL
      AND ledger."stripeConnectionId" IS NOT NULL
    UNION ALL
    SELECT operation."membershipId", operation."stripeConnectionId"
    FROM "CommerceOperation" AS operation
    WHERE operation."membershipId" IS NOT NULL
      AND operation."stripeConnectionId" IS NOT NULL
    UNION ALL
    SELECT membership."id", ledger."stripeConnectionId"
    FROM "StudioMembership" AS membership
    INNER JOIN "CommerceLedgerEntry" AS ledger
      ON ledger."metadata" ->> 'subscriptionId' = membership."stripeSubscriptionId"
      AND ledger."organizationId" = membership."organizationId"
      AND ledger."locationId" IS NOT DISTINCT FROM membership."locationId"
    WHERE membership."stripeSubscriptionId" IS NOT NULL
      AND ledger."stripeConnectionId" IS NOT NULL
  ) AS candidate
  GROUP BY candidate."membershipId"
  HAVING count(DISTINCT candidate."stripeConnectionId") = 1
)
UPDATE "StudioMembership" AS membership
SET "stripeConnectionId" = candidate."stripeConnectionId"
FROM membership_candidates AS candidate
WHERE membership."id" = candidate.id;

WITH plan_candidates AS (
  SELECT candidate."planId" AS id,
    min(candidate."stripeConnectionId") AS "stripeConnectionId"
  FROM (
    SELECT membership."planId", membership."stripeConnectionId"
    FROM "StudioMembership" AS membership
    WHERE membership."planId" IS NOT NULL
      AND membership."stripeConnectionId" IS NOT NULL
    UNION ALL
    SELECT operation."metadata" ->> 'planId', operation."stripeConnectionId"
    FROM "CommerceOperation" AS operation
    WHERE operation."metadata" ->> 'planId' IS NOT NULL
      AND operation."stripeConnectionId" IS NOT NULL
  ) AS candidate("planId", "stripeConnectionId")
  GROUP BY candidate."planId"
  HAVING count(DISTINCT candidate."stripeConnectionId") = 1
)
UPDATE "MembershipPlan" AS plan
SET "stripeConnectionId" = candidate."stripeConnectionId"
FROM plan_candidates AS candidate
WHERE plan."id" = candidate.id;

WITH event_candidates AS (
  SELECT ledger."stripeEventId" AS id,
    min(ledger."stripeConnectionId") AS "stripeConnectionId"
  FROM "CommerceLedgerEntry" AS ledger
  WHERE ledger."stripeEventId" IS NOT NULL
    AND ledger."stripeConnectionId" IS NOT NULL
  GROUP BY ledger."stripeEventId"
  HAVING count(DISTINCT ledger."stripeConnectionId") = 1
)
UPDATE "StripeEvent" AS event
SET "stripeConnectionId" = candidate."stripeConnectionId"
FROM event_candidates AS candidate
WHERE event."id" = candidate.id;

UPDATE "CommerceLedgerEntry" AS ledger
SET "instructorId" = instructor."id"
FROM "Instructor" AS instructor
WHERE ledger."kind" = 'PAYOUT'
  AND ledger."metadata" ->> 'instructorId' = instructor."id"
  AND ledger."providerAccountId" = instructor."stripeAccountId"
  AND ledger."organizationId" = instructor."organizationId"
  AND ledger."locationId" IS NOT DISTINCT FROM instructor."locationId";

WITH event_instructor_candidates AS (
  SELECT ledger."stripeEventId" AS id,
    min(ledger."instructorId") AS "instructorId"
  FROM "CommerceLedgerEntry" AS ledger
  WHERE ledger."stripeEventId" IS NOT NULL
    AND ledger."instructorId" IS NOT NULL
  GROUP BY ledger."stripeEventId"
  HAVING count(DISTINCT ledger."instructorId") = 1
)
UPDATE "StripeEvent" AS event
SET "instructorId" = candidate."instructorId"
FROM event_instructor_candidates AS candidate
WHERE event."id" = candidate.id;

UPDATE "StripeEvent" AS event
SET "instructorId" = instructor."id"
FROM "Instructor" AS instructor
WHERE event."source" = 'STRIPE_CONNECT_INSTRUCTOR'
  AND event."instructorId" IS NULL
  AND event."stripeAccountId" = instructor."stripeAccountId"
  AND event."organizationId" = instructor."organizationId"
  AND event."locationId" IS NOT DISTINCT FROM instructor."locationId";
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StripeConnection" AS connection
    LEFT JOIN "Location" AS location
      ON location."organizationId" = connection."organizationId"
      AND location."id" = connection."locationId"
    WHERE connection."locationId" IS NOT NULL
      AND location."id" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe connections reference a location outside their organization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT operation."organizationId", operation."locationId", operation."stripeConnectionId"
      FROM "CommerceOperation" AS operation
      WHERE operation."stripeConnectionId" IS NOT NULL
      UNION ALL
      SELECT ledger."organizationId", ledger."locationId", ledger."stripeConnectionId"
      FROM "CommerceLedgerEntry" AS ledger
      WHERE ledger."stripeConnectionId" IS NOT NULL
      UNION ALL
      SELECT payment."organizationId", payment."locationId", payment."stripeConnectionId"
      FROM "StudioPayment" AS payment
      WHERE payment."stripeConnectionId" IS NOT NULL
      UNION ALL
      SELECT membership."organizationId", membership."locationId", membership."stripeConnectionId"
      FROM "StudioMembership" AS membership
      WHERE membership."stripeConnectionId" IS NOT NULL
      UNION ALL
      SELECT plan."organizationId", plan."locationId", plan."stripeConnectionId"
      FROM "MembershipPlan" AS plan
      WHERE plan."stripeConnectionId" IS NOT NULL
      UNION ALL
      SELECT event."organizationId", event."locationId", event."stripeConnectionId"
      FROM "StripeEvent" AS event
      WHERE event."stripeConnectionId" IS NOT NULL
    ) AS scoped_record
    LEFT JOIN "StripeConnection" AS connection
      ON connection."id" = scoped_record."stripeConnectionId"
    WHERE connection."id" IS NULL
      OR scoped_record."organizationId" IS DISTINCT FROM connection."organizationId"
      OR scoped_record."locationId" IS DISTINCT FROM connection."locationId"
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe connection bindings do not match exact organization and location scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CommerceOperation" AS operation
    INNER JOIN "StripeConnection" AS connection
      ON connection."id" = operation."stripeConnectionId"
    WHERE operation."providerAccountId" IS DISTINCT FROM connection."stripeAccountId"
  ) OR EXISTS (
    SELECT 1
    FROM "CommerceLedgerEntry" AS ledger
    INNER JOIN "StripeConnection" AS connection
      ON connection."id" = ledger."stripeConnectionId"
    WHERE ledger."providerAccountId" IS DISTINCT FROM connection."stripeAccountId"
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe external account snapshots disagree with internal bindings';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT ledger."organizationId", ledger."locationId",
        ledger."instructorId", ledger."providerAccountId"
      FROM "CommerceLedgerEntry" AS ledger
      WHERE ledger."instructorId" IS NOT NULL
      UNION ALL
      SELECT event."organizationId", event."locationId",
        event."instructorId", event."stripeAccountId"
      FROM "StripeEvent" AS event
      WHERE event."instructorId" IS NOT NULL
    ) AS scoped_record
    LEFT JOIN "Instructor" AS instructor
      ON instructor."id" = scoped_record."instructorId"
    WHERE instructor."id" IS NULL
      OR scoped_record."organizationId" IS DISTINCT FROM instructor."organizationId"
      OR scoped_record."locationId" IS DISTINCT FROM instructor."locationId"
      OR scoped_record."providerAccountId" IS DISTINCT FROM instructor."stripeAccountId"
  ) THEN
    RAISE EXCEPTION '0033 preflight: instructor Stripe bindings do not match exact account scope';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "CommerceOperation"
    WHERE "provider" = 'STRIPE'
      AND "stripeConnectionId" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe commerce operations have ambiguous account ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "CommerceLedgerEntry"
    WHERE "provider" = 'STRIPE'
      AND "kind" <> 'PAYOUT'
      AND "stripeConnectionId" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe ledger entries have ambiguous account ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "CommerceLedgerEntry"
    WHERE "provider" = 'STRIPE'
      AND "kind" = 'PAYOUT'
      AND ("instructorId" IS NULL OR "providerAccountId" IS NULL)
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe payouts have ambiguous instructor account ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "StudioPayment"
    WHERE "stripePaymentIntentId" IS NOT NULL
      AND "stripeConnectionId" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe studio payments have ambiguous account ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "StudioMembership"
    WHERE "stripeSubscriptionId" IS NOT NULL
      AND "stripeConnectionId" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe memberships have ambiguous account ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MembershipPlan"
    WHERE ("stripePriceId" IS NOT NULL OR "stripeProductId" IS NOT NULL)
      AND "stripeConnectionId" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: Stripe membership plans have ambiguous account ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "StripeEvent"
    WHERE "source" <> 'STRIPE_CONNECT_INSTRUCTOR'
      AND "organizationId" IS NOT NULL
      AND "status" = 'PROCESSED'
      AND "stripeConnectionId" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: processed Stripe events have ambiguous account ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "StripeEvent"
    WHERE "source" = 'STRIPE_CONNECT_INSTRUCTOR'
      AND "status" = 'PROCESSED'
      AND "instructorId" IS NULL
  ) THEN
    RAISE EXCEPTION '0033 preflight: processed instructor Stripe events have ambiguous account ownership';
  END IF;

  IF EXISTS (
    SELECT "stripeSubscriptionId"
    FROM "StudioMembership"
    WHERE "stripeSubscriptionId" IS NOT NULL
    GROUP BY "stripeSubscriptionId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '0033 preflight: duplicate Stripe subscription IDs require reconciliation';
  END IF;

  IF EXISTS (
    SELECT "stripeAccountId"
    FROM "Instructor"
    WHERE "stripeAccountId" IS NOT NULL
    GROUP BY "stripeAccountId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '0033 preflight: duplicate instructor Stripe account IDs require reconciliation';
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX "CommerceOperation_stripeConnectionId_idx" ON "CommerceOperation" USING btree ("stripeConnectionId");
CREATE INDEX "CommerceLedgerEntry_stripeConnectionId_idx" ON "CommerceLedgerEntry" USING btree ("stripeConnectionId");
CREATE INDEX "CommerceLedgerEntry_instructorId_idx" ON "CommerceLedgerEntry" USING btree ("instructorId");
CREATE INDEX "StudioPayment_stripeConnectionId_idx" ON "StudioPayment" USING btree ("stripeConnectionId");
CREATE INDEX "StudioMembership_stripeConnectionId_idx" ON "StudioMembership" USING btree ("stripeConnectionId");
CREATE INDEX "MembershipPlan_stripeConnectionId_idx" ON "MembershipPlan" USING btree ("stripeConnectionId");
CREATE INDEX "StripeEvent_stripeConnectionId_idx" ON "StripeEvent" USING btree ("stripeConnectionId");
CREATE INDEX "StripeEvent_instructorId_idx" ON "StripeEvent" USING btree ("instructorId");
CREATE UNIQUE INDEX "StudioMembership_stripeSubscriptionId_key"
  ON "StudioMembership" USING btree ("stripeSubscriptionId")
  WHERE "stripeSubscriptionId" IS NOT NULL;
CREATE UNIQUE INDEX "Instructor_stripeAccountId_key"
  ON "Instructor" USING btree ("stripeAccountId")
  WHERE "stripeAccountId" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "StripeConnection" DROP CONSTRAINT IF EXISTS "StripeConnection_locationId_fkey";
ALTER TABLE "StripeConnection"
  ADD CONSTRAINT "StripeConnection_organizationId_locationId_fkey"
  FOREIGN KEY ("organizationId", "locationId")
  REFERENCES "Location"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommerceOperation"
  ADD CONSTRAINT "CommerceOperation_stripe_binding_check"
  CHECK (
    upper("provider") <> 'STRIPE'
    OR ("stripeConnectionId" IS NOT NULL AND "providerAccountId" IS NOT NULL)
  );
ALTER TABLE "CommerceOperation"
  ADD CONSTRAINT "CommerceOperation_stripeConnection_scope_fkey"
  FOREIGN KEY ("organizationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommerceOperation"
  ADD CONSTRAINT "CommerceOperation_stripeConnection_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "locationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommerceLedgerEntry"
  ADD CONSTRAINT "CommerceLedgerEntry_stripe_binding_check"
  CHECK (
    upper("provider") <> 'STRIPE'
    OR (
      "kind" = 'PAYOUT'
      AND "instructorId" IS NOT NULL
      AND "providerAccountId" IS NOT NULL
      AND "stripeConnectionId" IS NULL
    )
    OR (
      "kind" <> 'PAYOUT'
      AND "stripeConnectionId" IS NOT NULL
      AND "providerAccountId" IS NOT NULL
      AND "instructorId" IS NULL
    )
  );
ALTER TABLE "CommerceLedgerEntry"
  ADD CONSTRAINT "CommerceLedgerEntry_stripeConnection_scope_fkey"
  FOREIGN KEY ("organizationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommerceLedgerEntry"
  ADD CONSTRAINT "CommerceLedgerEntry_stripeConnection_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "locationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommerceLedgerEntry"
  ADD CONSTRAINT "CommerceLedgerEntry_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudioPayment"
  ADD CONSTRAINT "StudioPayment_stripe_binding_check"
  CHECK ("stripePaymentIntentId" IS NULL OR "stripeConnectionId" IS NOT NULL);
ALTER TABLE "StudioPayment"
  ADD CONSTRAINT "StudioPayment_stripeConnection_scope_fkey"
  FOREIGN KEY ("organizationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudioPayment"
  ADD CONSTRAINT "StudioPayment_stripeConnection_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "locationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudioMembership"
  ADD CONSTRAINT "StudioMembership_stripeConnection_organization_check"
  CHECK ("stripeConnectionId" IS NULL OR "organizationId" IS NOT NULL);
ALTER TABLE "StudioMembership"
  ADD CONSTRAINT "StudioMembership_stripe_binding_check"
  CHECK ("stripeSubscriptionId" IS NULL OR "stripeConnectionId" IS NOT NULL);
ALTER TABLE "StudioMembership"
  ADD CONSTRAINT "StudioMembership_stripeConnection_scope_fkey"
  FOREIGN KEY ("organizationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudioMembership"
  ADD CONSTRAINT "StudioMembership_stripeConnection_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "locationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MembershipPlan"
  ADD CONSTRAINT "MembershipPlan_stripe_binding_check"
  CHECK (
    ("stripePriceId" IS NULL AND "stripeProductId" IS NULL)
    OR "stripeConnectionId" IS NOT NULL
  );
ALTER TABLE "MembershipPlan"
  ADD CONSTRAINT "MembershipPlan_stripeConnection_scope_fkey"
  FOREIGN KEY ("organizationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipPlan"
  ADD CONSTRAINT "MembershipPlan_stripeConnection_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "locationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StripeEvent"
  ADD CONSTRAINT "StripeEvent_stripeConnection_organization_check"
  CHECK ("stripeConnectionId" IS NULL OR "organizationId" IS NOT NULL);
ALTER TABLE "StripeEvent"
  ADD CONSTRAINT "StripeEvent_stripeConnection_scope_fkey"
  FOREIGN KEY ("organizationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StripeEvent"
  ADD CONSTRAINT "StripeEvent_stripeConnection_location_scope_fkey"
  FOREIGN KEY ("organizationId", "locationId", "stripeConnectionId")
  REFERENCES "StripeConnection"("organizationId", "locationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StripeEvent"
  ADD CONSTRAINT "StripeEvent_instructor_organization_check"
  CHECK ("instructorId" IS NULL OR "organizationId" IS NOT NULL);
ALTER TABLE "StripeEvent"
  ADD CONSTRAINT "StripeEvent_processed_binding_check"
  CHECK (
    "status" <> 'PROCESSED'
    OR (
      "source" = 'STRIPE_CONNECT_INSTRUCTOR'
      AND "instructorId" IS NOT NULL
    )
    OR (
      "source" <> 'STRIPE_CONNECT_INSTRUCTOR'
      AND ("organizationId" IS NULL OR "stripeConnectionId" IS NOT NULL)
    )
  );
ALTER TABLE "StripeEvent"
  ADD CONSTRAINT "StripeEvent_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_stripe_connection_exact_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  bound_organization_id text;
  bound_location_id text;
  bound_stripe_account_id text;
  snapshot_stripe_account_id text;
BEGIN
  IF NEW."stripeConnectionId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT connection."organizationId", connection."locationId", connection."stripeAccountId"
  INTO bound_organization_id, bound_location_id, bound_stripe_account_id
  FROM "StripeConnection" AS connection
  WHERE connection."id" = NEW."stripeConnectionId";

  snapshot_stripe_account_id := COALESCE(
    to_jsonb(NEW) ->> 'providerAccountId',
    to_jsonb(NEW) ->> 'stripeAccountId'
  );

  IF NOT FOUND
    OR NEW."organizationId" IS DISTINCT FROM bound_organization_id
    OR NEW."locationId" IS DISTINCT FROM bound_location_id
    OR (
      snapshot_stripe_account_id IS NOT NULL
      AND snapshot_stripe_account_id IS DISTINCT FROM bound_stripe_account_id
    )
  THEN
    RAISE EXCEPTION 'Stripe connection must match the record organization and location exactly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CommerceOperation_exact_stripe_scope"
BEFORE INSERT OR UPDATE ON "CommerceOperation"
FOR EACH ROW EXECUTE FUNCTION enforce_stripe_connection_exact_scope();
CREATE TRIGGER "CommerceLedgerEntry_exact_stripe_scope"
BEFORE INSERT OR UPDATE ON "CommerceLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION enforce_stripe_connection_exact_scope();
CREATE TRIGGER "StudioPayment_exact_stripe_scope"
BEFORE INSERT OR UPDATE ON "StudioPayment"
FOR EACH ROW EXECUTE FUNCTION enforce_stripe_connection_exact_scope();
CREATE TRIGGER "StudioMembership_exact_stripe_scope"
BEFORE INSERT OR UPDATE ON "StudioMembership"
FOR EACH ROW EXECUTE FUNCTION enforce_stripe_connection_exact_scope();
CREATE TRIGGER "MembershipPlan_exact_stripe_scope"
BEFORE INSERT OR UPDATE ON "MembershipPlan"
FOR EACH ROW EXECUTE FUNCTION enforce_stripe_connection_exact_scope();
CREATE TRIGGER "StripeEvent_exact_stripe_scope"
BEFORE INSERT OR UPDATE ON "StripeEvent"
FOR EACH ROW EXECUTE FUNCTION enforce_stripe_connection_exact_scope();

CREATE OR REPLACE FUNCTION enforce_ledger_instructor_stripe_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  bound_organization_id text;
  bound_location_id text;
  bound_stripe_account_id text;
BEGIN
  IF NEW."instructorId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT instructor."organizationId", instructor."locationId", instructor."stripeAccountId"
  INTO bound_organization_id, bound_location_id, bound_stripe_account_id
  FROM "Instructor" AS instructor
  WHERE instructor."id" = NEW."instructorId";

  IF NOT FOUND
    OR NEW."organizationId" IS DISTINCT FROM bound_organization_id
    OR NEW."locationId" IS DISTINCT FROM bound_location_id
    OR NEW."providerAccountId" IS DISTINCT FROM bound_stripe_account_id
  THEN
    RAISE EXCEPTION 'Instructor Stripe binding must match the ledger account scope exactly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "CommerceLedgerEntry_exact_instructor_stripe_scope"
BEFORE INSERT OR UPDATE ON "CommerceLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_instructor_stripe_scope();

CREATE OR REPLACE FUNCTION enforce_event_instructor_stripe_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  bound_organization_id text;
  bound_location_id text;
  bound_stripe_account_id text;
BEGIN
  IF NEW."instructorId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT instructor."organizationId", instructor."locationId", instructor."stripeAccountId"
  INTO bound_organization_id, bound_location_id, bound_stripe_account_id
  FROM "Instructor" AS instructor
  WHERE instructor."id" = NEW."instructorId";

  IF NOT FOUND
    OR NEW."organizationId" IS DISTINCT FROM bound_organization_id
    OR NEW."locationId" IS DISTINCT FROM bound_location_id
    OR NEW."stripeAccountId" IS DISTINCT FROM bound_stripe_account_id
  THEN
    RAISE EXCEPTION 'Instructor Stripe binding must match the event account scope exactly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StripeEvent_exact_instructor_stripe_scope"
BEFORE INSERT OR UPDATE ON "StripeEvent"
FOR EACH ROW EXECUTE FUNCTION enforce_event_instructor_stripe_scope();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION protect_stripe_connection_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR OLD."locationId" IS DISTINCT FROM NEW."locationId"
    OR OLD."stripeAccountId" IS DISTINCT FROM NEW."stripeAccountId"
  THEN
    RAISE EXCEPTION 'Stripe connection account identity and scope are immutable; create a replacement binding instead';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StripeConnection_immutable_identity"
BEFORE UPDATE OF "organizationId", "locationId", "stripeAccountId"
ON "StripeConnection"
FOR EACH ROW
EXECUTE FUNCTION protect_stripe_connection_identity();

CREATE OR REPLACE FUNCTION protect_instructor_stripe_account_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."stripeAccountId" IS NOT NULL
    AND OLD."stripeAccountId" IS DISTINCT FROM NEW."stripeAccountId"
  THEN
    RAISE EXCEPTION 'Instructor Stripe account identity is immutable after binding';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Instructor_immutable_stripe_account_identity"
BEFORE UPDATE OF "stripeAccountId"
ON "Instructor"
FOR EACH ROW
EXECUTE FUNCTION protect_instructor_stripe_account_identity();
