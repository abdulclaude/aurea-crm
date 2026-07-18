CREATE TYPE "public"."SchedulingPolicySource" AS ENUM (
  'CLASS_OVERRIDE',
  'SERVICE_TYPE',
  'LOCATION_DEFAULT',
  'ORGANIZATION_DEFAULT',
  'LEGACY'
);

CREATE TYPE "public"."WaitlistPolicyMode" AS ENUM (
  'DISABLED',
  'MANUAL',
  'OFFER_NEXT',
  'AUTO_BOOK'
);

CREATE TYPE "public"."WaitlistCreditHoldPolicy" AS ENUM (
  'NONE',
  'HOLD_ON_JOIN'
);

CREATE TYPE "public"."WaitlistFailureFallback" AS ENUM (
  'OFFER_NEXT',
  'NOTIFY_ALL',
  'MANUAL_REVIEW'
);

CREATE TABLE "BookingWindowPolicy" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "description" text,
  "isDefault" boolean DEFAULT false NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "BookingWindowPolicy_text_check"
    CHECK (length("name") BETWEEN 1 AND 120 AND ("description" IS NULL OR length("description") <= 500)),
  CONSTRAINT "BookingWindowPolicy_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "BookingWindowPolicy_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "BookingWindowPolicy_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id")
    ON DELETE SET NULL ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "BookingWindowPolicy_location_name_key"
  ON "BookingWindowPolicy" ("organizationId", "locationId", "name")
  WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "BookingWindowPolicy_org_name_key"
  ON "BookingWindowPolicy" ("organizationId", "name")
  WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "BookingWindowPolicy_active_location_default_key"
  ON "BookingWindowPolicy" ("organizationId", "locationId")
  WHERE "isActive" = true AND "isDefault" = true AND "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "BookingWindowPolicy_active_org_default_key"
  ON "BookingWindowPolicy" ("organizationId")
  WHERE "isActive" = true AND "isDefault" = true AND "locationId" IS NULL;
CREATE UNIQUE INDEX "BookingWindowPolicy_scope_id_key"
  ON "BookingWindowPolicy" ("organizationId", "locationId", "id");
CREATE UNIQUE INDEX "BookingWindowPolicy_organization_id_key"
  ON "BookingWindowPolicy" ("organizationId", "id");

CREATE TABLE "BookingWindowPolicyVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "policyId" text NOT NULL,
  "version" integer NOT NULL,
  "schemaVersion" integer DEFAULT 1 NOT NULL,
  "opensMinutesBeforeStart" integer NOT NULL,
  "closesMinutesBeforeStart" integer NOT NULL,
  "cancellationsCloseMinutesBeforeStart" integer NOT NULL,
  "blockClientCancellations" boolean DEFAULT false NOT NULL,
  "effectiveFrom" timestamptz(3) NOT NULL,
  "rollbackFromVersion" integer,
  "changeNote" text,
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "BookingWindowPolicyVersion_values_check"
    CHECK (
      "version" > 0
      AND "schemaVersion" > 0
      AND "opensMinutesBeforeStart" BETWEEN 0 AND 527040
      AND "closesMinutesBeforeStart" BETWEEN -1440 AND 527040
      AND "opensMinutesBeforeStart" >= "closesMinutesBeforeStart"
      AND "cancellationsCloseMinutesBeforeStart" BETWEEN 0 AND 527040
    ),
  CONSTRAINT "BookingWindowPolicyVersion_rollback_check"
    CHECK ("rollbackFromVersion" IS NULL OR "rollbackFromVersion" > 0),
  CONSTRAINT "BookingWindowPolicyVersion_note_check"
    CHECK ("changeNote" IS NULL OR length("changeNote") <= 240),
  CONSTRAINT "BookingWindowPolicyVersion_scope_policy_fkey"
    FOREIGN KEY ("organizationId", "policyId")
    REFERENCES "public"."BookingWindowPolicy"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "BookingWindowPolicyVersion_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id")
    ON DELETE SET NULL ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "BookingWindowPolicyVersion_policy_version_key"
  ON "BookingWindowPolicyVersion" ("policyId", "version");
CREATE UNIQUE INDEX "BookingWindowPolicyVersion_organization_id_key"
  ON "BookingWindowPolicyVersion" ("organizationId", "id");
CREATE INDEX "BookingWindowPolicyVersion_policy_effective_key"
  ON "BookingWindowPolicyVersion" ("policyId", "effectiveFrom", "version");

CREATE TABLE "WaitlistPolicy" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "name" text NOT NULL,
  "description" text,
  "isDefault" boolean DEFAULT false NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "WaitlistPolicy_text_check"
    CHECK (length("name") BETWEEN 1 AND 120 AND ("description" IS NULL OR length("description") <= 500)),
  CONSTRAINT "WaitlistPolicy_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "WaitlistPolicy_scope_location_fkey"
    FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "WaitlistPolicy_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id")
    ON DELETE SET NULL ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "WaitlistPolicy_location_name_key"
  ON "WaitlistPolicy" ("organizationId", "locationId", "name")
  WHERE "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "WaitlistPolicy_org_name_key"
  ON "WaitlistPolicy" ("organizationId", "name")
  WHERE "locationId" IS NULL;
CREATE UNIQUE INDEX "WaitlistPolicy_active_location_default_key"
  ON "WaitlistPolicy" ("organizationId", "locationId")
  WHERE "isActive" = true AND "isDefault" = true AND "locationId" IS NOT NULL;
CREATE UNIQUE INDEX "WaitlistPolicy_active_org_default_key"
  ON "WaitlistPolicy" ("organizationId")
  WHERE "isActive" = true AND "isDefault" = true AND "locationId" IS NULL;
CREATE UNIQUE INDEX "WaitlistPolicy_scope_id_key"
  ON "WaitlistPolicy" ("organizationId", "locationId", "id");
CREATE UNIQUE INDEX "WaitlistPolicy_organization_id_key"
  ON "WaitlistPolicy" ("organizationId", "id");

CREATE TABLE "WaitlistPolicyVersion" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "policyId" text NOT NULL,
  "version" integer NOT NULL,
  "schemaVersion" integer DEFAULT 1 NOT NULL,
  "mode" "WaitlistPolicyMode" NOT NULL,
  "automationClosesMinutesBeforeStart" integer NOT NULL,
  "maxEntries" integer,
  "allowOverlappingReservations" boolean DEFAULT false NOT NULL,
  "creditHoldPolicy" "WaitlistCreditHoldPolicy" DEFAULT 'NONE' NOT NULL,
  "offerExpiryMinutes" integer,
  "failureFallback" "WaitlistFailureFallback" DEFAULT 'MANUAL_REVIEW' NOT NULL,
  "effectiveFrom" timestamptz(3) NOT NULL,
  "rollbackFromVersion" integer,
  "changeNote" text,
  "createdBy" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "WaitlistPolicyVersion_values_check"
    CHECK (
      "version" > 0
      AND "schemaVersion" > 0
      AND "automationClosesMinutesBeforeStart" BETWEEN 0 AND 527040
      AND ("maxEntries" IS NULL OR "maxEntries" BETWEEN 1 AND 10000)
      AND ("offerExpiryMinutes" IS NULL OR "offerExpiryMinutes" BETWEEN 1 AND 10080)
    ),
  CONSTRAINT "WaitlistPolicyVersion_disabled_check"
    CHECK ("mode" <> 'DISABLED' OR ("creditHoldPolicy" = 'NONE' AND "offerExpiryMinutes" IS NULL)),
  CONSTRAINT "WaitlistPolicyVersion_offer_expiry_check"
    CHECK (("mode" <> 'OFFER_NEXT' AND "failureFallback" <> 'OFFER_NEXT') OR "offerExpiryMinutes" IS NOT NULL),
  CONSTRAINT "WaitlistPolicyVersion_rollback_check"
    CHECK ("rollbackFromVersion" IS NULL OR "rollbackFromVersion" > 0),
  CONSTRAINT "WaitlistPolicyVersion_note_check"
    CHECK ("changeNote" IS NULL OR length("changeNote") <= 240),
  CONSTRAINT "WaitlistPolicyVersion_scope_policy_fkey"
    FOREIGN KEY ("organizationId", "policyId")
    REFERENCES "public"."WaitlistPolicy"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "WaitlistPolicyVersion_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id")
    ON DELETE SET NULL ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "WaitlistPolicyVersion_policy_version_key"
  ON "WaitlistPolicyVersion" ("policyId", "version");
CREATE UNIQUE INDEX "WaitlistPolicyVersion_organization_id_key"
  ON "WaitlistPolicyVersion" ("organizationId", "id");
CREATE INDEX "WaitlistPolicyVersion_policy_effective_key"
  ON "WaitlistPolicyVersion" ("policyId", "effectiveFrom", "version");

ALTER TABLE "ServiceType"
  ADD COLUMN "bookingWindowPolicyId" text,
  ADD COLUMN "waitlistPolicyId" text,
  ADD CONSTRAINT "ServiceType_bookingWindowPolicyId_fkey"
    FOREIGN KEY ("bookingWindowPolicyId") REFERENCES "public"."BookingWindowPolicy"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "ServiceType_waitlistPolicyId_fkey"
    FOREIGN KEY ("waitlistPolicyId") REFERENCES "public"."WaitlistPolicy"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX "ServiceType_bookingWindowPolicyId_idx"
  ON "ServiceType" ("bookingWindowPolicyId");
CREATE INDEX "ServiceType_waitlistPolicyId_idx"
  ON "ServiceType" ("waitlistPolicyId");

ALTER TABLE "StudioClass"
  ADD COLUMN "bookingWindowPolicyOverrideId" text,
  ADD COLUMN "resolvedBookingWindowPolicyId" text,
  ADD COLUMN "resolvedBookingWindowPolicyVersionId" text,
  ADD COLUMN "bookingWindowPolicySource" "SchedulingPolicySource" DEFAULT 'LEGACY' NOT NULL,
  ADD COLUMN "bookingOpensMinutesBeforeStart" integer,
  ADD COLUMN "bookingClosesMinutesBeforeStart" integer,
  ADD COLUMN "cancellationsCloseMinutesBeforeStart" integer,
  ADD COLUMN "blockClientCancellations" boolean,
  ADD COLUMN "waitlistPolicyOverrideId" text,
  ADD COLUMN "resolvedWaitlistPolicyId" text,
  ADD COLUMN "resolvedWaitlistPolicyVersionId" text,
  ADD COLUMN "waitlistPolicySource" "SchedulingPolicySource" DEFAULT 'LEGACY' NOT NULL,
  ADD COLUMN "waitlistMode" "WaitlistPolicyMode",
  ADD COLUMN "waitlistAutomationClosesMinutesBeforeStart" integer,
  ADD COLUMN "waitlistMaxEntries" integer,
  ADD COLUMN "waitlistAllowOverlappingReservations" boolean,
  ADD COLUMN "waitlistCreditHoldPolicy" "WaitlistCreditHoldPolicy",
  ADD COLUMN "waitlistOfferExpiryMinutes" integer,
  ADD COLUMN "waitlistFailureFallback" "WaitlistFailureFallback",
  ADD COLUMN "schedulingPolicySchemaVersion" integer,
  ADD COLUMN "schedulingPolicyResolvedAt" timestamptz(3),
  ADD CONSTRAINT "StudioClass_bookingWindowPolicyOverrideId_fkey"
    FOREIGN KEY ("bookingWindowPolicyOverrideId") REFERENCES "public"."BookingWindowPolicy"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "StudioClass_resolvedBookingWindowPolicyId_fkey"
    FOREIGN KEY ("resolvedBookingWindowPolicyId") REFERENCES "public"."BookingWindowPolicy"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "StudioClass_resolvedBookingWindowPolicyVersionId_fkey"
    FOREIGN KEY ("resolvedBookingWindowPolicyVersionId") REFERENCES "public"."BookingWindowPolicyVersion"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "StudioClass_waitlistPolicyOverrideId_fkey"
    FOREIGN KEY ("waitlistPolicyOverrideId") REFERENCES "public"."WaitlistPolicy"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "StudioClass_resolvedWaitlistPolicyId_fkey"
    FOREIGN KEY ("resolvedWaitlistPolicyId") REFERENCES "public"."WaitlistPolicy"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "StudioClass_resolvedWaitlistPolicyVersionId_fkey"
    FOREIGN KEY ("resolvedWaitlistPolicyVersionId") REFERENCES "public"."WaitlistPolicyVersion"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX "StudioClass_bookingWindowPolicyOverrideId_idx"
  ON "StudioClass" ("bookingWindowPolicyOverrideId");
CREATE INDEX "StudioClass_resolvedBookingWindowPolicyVersionId_idx"
  ON "StudioClass" ("resolvedBookingWindowPolicyVersionId");
CREATE INDEX "StudioClass_waitlistPolicyOverrideId_idx"
  ON "StudioClass" ("waitlistPolicyOverrideId");
CREATE INDEX "StudioClass_resolvedWaitlistPolicyVersionId_idx"
  ON "StudioClass" ("resolvedWaitlistPolicyVersionId");

ALTER TABLE "StudioBooking"
  ADD COLUMN "bookingWindowPolicyVersionId" text,
  ADD COLUMN "bookingWindowPolicySource" "SchedulingPolicySource" DEFAULT 'LEGACY' NOT NULL,
  ADD COLUMN "selfCancellationBlocked" boolean DEFAULT false NOT NULL,
  ADD COLUMN "selfCancelClosesAt" timestamptz(3),
  ADD CONSTRAINT "StudioBooking_bookingWindowPolicyVersionId_fkey"
    FOREIGN KEY ("bookingWindowPolicyVersionId") REFERENCES "public"."BookingWindowPolicyVersion"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ClassWaitlist"
  ADD COLUMN "waitlistPolicyVersionId" text,
  ADD COLUMN "waitlistPolicySource" "SchedulingPolicySource" DEFAULT 'LEGACY' NOT NULL,
  ADD COLUMN "offerExpiresAt" timestamptz(3),
  ADD COLUMN "offerDispatchedAt" timestamptz(3),
  ADD COLUMN "offerDispatchAttempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "lastOfferDispatchAt" timestamptz(3),
  ADD COLUMN "offerDispatchError" text,
  ADD CONSTRAINT "ClassWaitlist_offerDispatchAttempts_check"
    CHECK ("offerDispatchAttempts" >= 0),
  ADD CONSTRAINT "ClassWaitlist_offerDispatchError_check"
    CHECK ("offerDispatchError" IS NULL OR length("offerDispatchError") <= 1000),
  ADD CONSTRAINT "ClassWaitlist_waitlistPolicyVersionId_fkey"
    FOREIGN KEY ("waitlistPolicyVersionId") REFERENCES "public"."WaitlistPolicyVersion"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX "ClassWaitlist_offerExpiresAt_idx"
  ON "ClassWaitlist" ("offerExpiresAt");
CREATE INDEX "ClassWaitlist_pendingOfferDispatch_idx"
  ON "ClassWaitlist" ("notifiedAt")
  WHERE "status" = 'NOTIFIED' AND "offerDispatchedAt" IS NULL;

UPDATE "StudioClass"
SET
  "bookingWindowPolicySource" = 'LEGACY',
  "bookingOpensMinutesBeforeStart" = COALESCE("bookingWindowHours", 168) * 60,
  "bookingClosesMinutesBeforeStart" = 0,
  "cancellationsCloseMinutesBeforeStart" = COALESCE("cancellationWindowHours", 12) * 60,
  "blockClientCancellations" = false,
  "waitlistPolicySource" = 'LEGACY',
  "waitlistMode" = CASE
    WHEN "waitlistEnabled" = false THEN 'DISABLED'::"WaitlistPolicyMode"
    WHEN "autoPromoteWaitlist" = true THEN 'OFFER_NEXT'::"WaitlistPolicyMode"
    ELSE 'MANUAL'::"WaitlistPolicyMode"
  END,
  "waitlistAutomationClosesMinutesBeforeStart" = 0,
  "waitlistAllowOverlappingReservations" = true,
  "waitlistCreditHoldPolicy" = 'NONE',
  "waitlistOfferExpiryMinutes" = CASE
    WHEN "waitlistEnabled" = true AND "autoPromoteWaitlist" = true THEN 15
    ELSE NULL
  END,
  "waitlistFailureFallback" = 'MANUAL_REVIEW',
  "schedulingPolicySchemaVersion" = 1,
  "schedulingPolicyResolvedAt" = CURRENT_TIMESTAMP;

UPDATE "StudioBooking" AS booking
SET
  "bookingWindowPolicySource" = class."bookingWindowPolicySource",
  "bookingWindowPolicyVersionId" = class."resolvedBookingWindowPolicyVersionId",
  "selfCancellationBlocked" = COALESCE(class."blockClientCancellations", false),
  "selfCancelClosesAt" = class."startTime" - make_interval(mins => COALESCE(class."cancellationsCloseMinutesBeforeStart", 720))
FROM "StudioClass" AS class
WHERE class."id" = booking."classId";

UPDATE "ClassWaitlist" AS waitlist
SET
  "waitlistPolicySource" = class."waitlistPolicySource",
  "waitlistPolicyVersionId" = class."resolvedWaitlistPolicyVersionId",
  "offerDispatchedAt" = CASE
    WHEN waitlist."status" = 'NOTIFIED' THEN waitlist."notifiedAt"
    ELSE NULL
  END
FROM "StudioClass" AS class
WHERE class."id" = waitlist."classId";

CREATE OR REPLACE FUNCTION "protect_scheduling_policy_version_history"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD."createdBy" IS NOT NULL
    AND NEW."createdBy" IS NULL
    AND to_jsonb(NEW) - 'createdBy' = to_jsonb(OLD) - 'createdBy'
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Scheduling policy versions are append-only';
END;
$$;

CREATE TRIGGER "BookingWindowPolicyVersion_protect_history"
BEFORE UPDATE OR DELETE ON "BookingWindowPolicyVersion"
FOR EACH ROW EXECUTE FUNCTION "protect_scheduling_policy_version_history"();

CREATE TRIGGER "WaitlistPolicyVersion_protect_history"
BEFORE UPDATE OR DELETE ON "WaitlistPolicyVersion"
FOR EACH ROW EXECUTE FUNCTION "protect_scheduling_policy_version_history"();

CREATE OR REPLACE FUNCTION "validate_scheduling_policy_assignment_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booking_scope record;
  waitlist_scope record;
BEGIN
  IF NEW."bookingWindowPolicyId" IS NOT NULL THEN
    SELECT "organizationId", "locationId", "isActive"
    INTO booking_scope
    FROM "BookingWindowPolicy"
    WHERE "id" = NEW."bookingWindowPolicyId";
    IF NOT FOUND
      OR booking_scope."organizationId" <> NEW."organizationId"
      OR (booking_scope."locationId" IS NOT NULL AND booking_scope."locationId" IS DISTINCT FROM NEW."locationId")
      OR booking_scope."isActive" = false
    THEN
      RAISE EXCEPTION 'Booking window policy is outside the service workspace scope';
    END IF;
  END IF;

  IF NEW."waitlistPolicyId" IS NOT NULL THEN
    SELECT "organizationId", "locationId", "isActive"
    INTO waitlist_scope
    FROM "WaitlistPolicy"
    WHERE "id" = NEW."waitlistPolicyId";
    IF NOT FOUND
      OR waitlist_scope."organizationId" <> NEW."organizationId"
      OR (waitlist_scope."locationId" IS NOT NULL AND waitlist_scope."locationId" IS DISTINCT FROM NEW."locationId")
      OR waitlist_scope."isActive" = false
    THEN
      RAISE EXCEPTION 'Waitlist policy is outside the service workspace scope';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ServiceType_validate_scheduling_policy_scope"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "bookingWindowPolicyId", "waitlistPolicyId"
ON "ServiceType"
FOR EACH ROW EXECUTE FUNCTION "validate_scheduling_policy_assignment_scope"();

CREATE OR REPLACE FUNCTION "validate_class_scheduling_policy_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  policy_scope record;
  version_scope record;
BEGIN
  IF (NEW."resolvedBookingWindowPolicyId" IS NULL) <> (NEW."resolvedBookingWindowPolicyVersionId" IS NULL)
  THEN RAISE EXCEPTION 'Resolved booking window policy and version must be stored together'; END IF;
  IF (NEW."resolvedWaitlistPolicyId" IS NULL) <> (NEW."resolvedWaitlistPolicyVersionId" IS NULL)
  THEN RAISE EXCEPTION 'Resolved waitlist policy and version must be stored together'; END IF;

  IF NEW."bookingWindowPolicyOverrideId" IS NOT NULL THEN
    SELECT "organizationId", "locationId", "isActive" INTO policy_scope
    FROM "BookingWindowPolicy" WHERE "id" = NEW."bookingWindowPolicyOverrideId";
    IF NOT FOUND OR policy_scope."organizationId" <> NEW."organizationId"
      OR (policy_scope."locationId" IS NOT NULL AND policy_scope."locationId" IS DISTINCT FROM NEW."locationId")
      OR policy_scope."isActive" = false
    THEN RAISE EXCEPTION 'Booking window override is outside the class workspace scope'; END IF;
  END IF;

  IF NEW."resolvedBookingWindowPolicyVersionId" IS NOT NULL THEN
    SELECT version."organizationId", version."policyId" INTO version_scope
    FROM "BookingWindowPolicyVersion" AS version
    WHERE version."id" = NEW."resolvedBookingWindowPolicyVersionId";
    IF NOT FOUND OR version_scope."organizationId" <> NEW."organizationId"
      OR version_scope."policyId" IS DISTINCT FROM NEW."resolvedBookingWindowPolicyId"
    THEN RAISE EXCEPTION 'Resolved booking window version is outside the class workspace scope'; END IF;
  END IF;

  IF NEW."waitlistPolicyOverrideId" IS NOT NULL THEN
    SELECT "organizationId", "locationId", "isActive" INTO policy_scope
    FROM "WaitlistPolicy" WHERE "id" = NEW."waitlistPolicyOverrideId";
    IF NOT FOUND OR policy_scope."organizationId" <> NEW."organizationId"
      OR (policy_scope."locationId" IS NOT NULL AND policy_scope."locationId" IS DISTINCT FROM NEW."locationId")
      OR policy_scope."isActive" = false
    THEN RAISE EXCEPTION 'Waitlist override is outside the class workspace scope'; END IF;
  END IF;

  IF NEW."resolvedWaitlistPolicyVersionId" IS NOT NULL THEN
    SELECT version."organizationId", version."policyId" INTO version_scope
    FROM "WaitlistPolicyVersion" AS version
    WHERE version."id" = NEW."resolvedWaitlistPolicyVersionId";
    IF NOT FOUND OR version_scope."organizationId" <> NEW."organizationId"
      OR version_scope."policyId" IS DISTINCT FROM NEW."resolvedWaitlistPolicyId"
    THEN RAISE EXCEPTION 'Resolved waitlist version is outside the class workspace scope'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StudioClass_validate_scheduling_policy_scope"
BEFORE INSERT OR UPDATE OF
  "organizationId", "locationId",
  "bookingWindowPolicyOverrideId", "resolvedBookingWindowPolicyId", "resolvedBookingWindowPolicyVersionId",
  "waitlistPolicyOverrideId", "resolvedWaitlistPolicyId", "resolvedWaitlistPolicyVersionId"
ON "StudioClass"
FOR EACH ROW EXECUTE FUNCTION "validate_class_scheduling_policy_scope"();

CREATE OR REPLACE FUNCTION "validate_booking_scheduling_policy_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  class_organization_id text;
  version_organization_id text;
BEGIN
  SELECT "organizationId" INTO class_organization_id
  FROM "StudioClass" WHERE "id" = NEW."classId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking class does not exist'; END IF;

  IF NEW."bookingWindowPolicyVersionId" IS NULL THEN
    IF NEW."bookingWindowPolicySource" <> 'LEGACY'
    THEN RAISE EXCEPTION 'Versioned booking provenance requires a policy version'; END IF;
  ELSE
    SELECT "organizationId" INTO version_organization_id
    FROM "BookingWindowPolicyVersion"
    WHERE "id" = NEW."bookingWindowPolicyVersionId";
    IF NOT FOUND OR version_organization_id <> class_organization_id
    THEN RAISE EXCEPTION 'Booking policy version is outside the class organization'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StudioBooking_validate_scheduling_policy_scope"
BEFORE INSERT OR UPDATE OF "classId", "bookingWindowPolicyVersionId", "bookingWindowPolicySource"
ON "StudioBooking"
FOR EACH ROW EXECUTE FUNCTION "validate_booking_scheduling_policy_scope"();

CREATE OR REPLACE FUNCTION "validate_waitlist_scheduling_policy_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  class_organization_id text;
  version_organization_id text;
BEGIN
  SELECT "organizationId" INTO class_organization_id
  FROM "StudioClass" WHERE "id" = NEW."classId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Waitlist class does not exist'; END IF;

  IF NEW."waitlistPolicyVersionId" IS NULL THEN
    IF NEW."waitlistPolicySource" <> 'LEGACY'
    THEN RAISE EXCEPTION 'Versioned waitlist provenance requires a policy version'; END IF;
  ELSE
    SELECT "organizationId" INTO version_organization_id
    FROM "WaitlistPolicyVersion"
    WHERE "id" = NEW."waitlistPolicyVersionId";
    IF NOT FOUND OR version_organization_id <> class_organization_id
    THEN RAISE EXCEPTION 'Waitlist policy version is outside the class organization'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ClassWaitlist_validate_scheduling_policy_scope"
BEFORE INSERT OR UPDATE OF "classId", "waitlistPolicyVersionId", "waitlistPolicySource"
ON "ClassWaitlist"
FOR EACH ROW EXECUTE FUNCTION "validate_waitlist_scheduling_policy_scope"();

ALTER TABLE "BookingWindowPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingWindowPolicyVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaitlistPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaitlistPolicyVersion" ENABLE ROW LEVEL SECURITY;
