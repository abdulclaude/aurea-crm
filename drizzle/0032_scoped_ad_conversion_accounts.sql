CREATE TYPE "public"."AdConversionDeliveryStatus" AS ENUM(
  'PROCESSING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TABLE "AdConversionDelivery" (
  "id" text PRIMARY KEY NOT NULL,
  "eventId" text NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text,
  "providerAccountId" text NOT NULL,
  "provider" text NOT NULL,
  "status" "AdConversionDeliveryStatus" DEFAULT 'PROCESSING' NOT NULL,
  "attemptCount" integer DEFAULT 1 NOT NULL,
  "providerEventId" text,
  "lastErrorCode" text,
  "lastAttemptAt" timestamp(3) NOT NULL,
  "succeededAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "AdConversionDelivery" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX "AdConversionDelivery_eventId_providerAccountId_key"
ON "AdConversionDelivery" USING btree ("eventId", "providerAccountId");

CREATE INDEX "AdConversionDelivery_scope_status_idx"
ON "AdConversionDelivery" USING btree (
  "organizationId",
  "locationId",
  "status"
);

CREATE INDEX "AdConversionDelivery_providerAccountId_idx"
ON "AdConversionDelivery" USING btree ("providerAccountId");

ALTER TABLE "AdConversionDelivery"
ADD CONSTRAINT "AdConversionDelivery_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "public"."FunnelEvent"("eventId")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "AdConversionDelivery"
ADD CONSTRAINT "AdConversionDelivery_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "AdConversionDelivery"
ADD CONSTRAINT "AdConversionDelivery_organizationId_locationId_fkey"
FOREIGN KEY ("organizationId", "locationId")
REFERENCES "public"."Location"("organizationId", "id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "AdConversionDelivery"
ADD CONSTRAINT "AdConversionDelivery_providerAccountId_fkey"
FOREIGN KEY ("organizationId", "providerAccountId")
REFERENCES "public"."ProviderAccount"("organizationId", "id")
ON DELETE restrict ON UPDATE cascade;

CREATE OR REPLACE FUNCTION enforce_ad_conversion_delivery_event_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_organization_id text;
  event_location_id text;
  funnel_location_id text;
BEGIN
  SELECT funnel."organizationId", event."locationId", funnel."locationId"
  INTO event_organization_id, event_location_id, funnel_location_id
  FROM "FunnelEvent" AS event
  INNER JOIN "Funnel" AS funnel ON funnel."id" = event."funnelId"
  WHERE event."eventId" = NEW."eventId";

  IF NOT FOUND
    OR NEW."organizationId" IS DISTINCT FROM event_organization_id
    OR NEW."locationId" IS DISTINCT FROM event_location_id
    OR event_location_id IS DISTINCT FROM funnel_location_id
  THEN
    RAISE EXCEPTION 'Ad conversion delivery must match the source event and funnel scope exactly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AdConversionDelivery_exact_event_scope"
BEFORE INSERT OR UPDATE ON "AdConversionDelivery"
FOR EACH ROW
EXECUTE FUNCTION enforce_ad_conversion_delivery_event_scope();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_ad_conversion_delivery_account_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  account_organization_id text;
  account_location_id text;
  account_provider text;
  account_inherits boolean;
BEGIN
  SELECT account."organizationId", account."locationId", account."provider",
    COALESCE((account."config" ->> 'inheritToLocations')::boolean, false)
  INTO account_organization_id, account_location_id, account_provider, account_inherits
  FROM "ProviderAccount" AS account
  WHERE account."id" = NEW."providerAccountId";

  IF NOT FOUND
    OR NEW."organizationId" IS DISTINCT FROM account_organization_id
    OR NEW."provider" IS DISTINCT FROM account_provider
    OR NOT (
      NEW."locationId" IS NOT DISTINCT FROM account_location_id
      OR (
        account_location_id IS NULL
        AND NEW."locationId" IS NOT NULL
        AND account_inherits
      )
    )
  THEN
    RAISE EXCEPTION 'Ad conversion delivery account must be authorized for the event scope';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AdConversionDelivery_exact_account_scope"
BEFORE INSERT OR UPDATE ON "AdConversionDelivery"
FOR EACH ROW
EXECUTE FUNCTION enforce_ad_conversion_delivery_account_scope();
