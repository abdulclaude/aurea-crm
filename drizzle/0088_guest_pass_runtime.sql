ALTER TABLE "CommerceGuestPassPolicyVersion" ADD COLUMN "scopeKey" text GENERATED ALWAYS AS (CASE WHEN "locationId" IS NULL THEN 'ORG' ELSE 'LOC:' || "locationId" END) STORED NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceGuestPassPolicyVersion_organization_id_key" ON "CommerceGuestPassPolicyVersion" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceGuestPassPolicyVersion_exact_scope_id_key" ON "CommerceGuestPassPolicyVersion" USING btree ("organizationId", "scopeKey", "id");
--> statement-breakpoint
CREATE TABLE "CommerceGuestPass" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"scopeKey" text GENERATED ALWAYS AS (CASE WHEN "locationId" IS NULL THEN 'ORG' ELSE 'LOC:' || "locationId" END) STORED NOT NULL,
	"ownerClientId" text NOT NULL,
	"policyVersionId" text NOT NULL,
	"guestName" text NOT NULL,
	"guestEmail" text,
	"guestPhone" text,
	"status" text NOT NULL,
	"allowedUses" integer DEFAULT 1 NOT NULL,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"policySnapshot" jsonb NOT NULL,
	"idempotencyKey" text NOT NULL,
	"issuedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"approvedAt" timestamp(3),
	"approvedById" text,
	"revokedAt" timestamp(3),
	"revokedById" text,
	"createdById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "CommerceGuestPass_status_check" CHECK ("status" IN ('PENDING_APPROVAL', 'ACTIVE', 'REDEEMED', 'EXPIRED', 'REVOKED')),
	CONSTRAINT "CommerceGuestPass_usage_check" CHECK ("allowedUses" > 0 AND "usedCount" BETWEEN 0 AND "allowedUses"),
	CONSTRAINT "CommerceGuestPass_expiry_check" CHECK ("expiresAt" > "issuedAt"),
	CONSTRAINT "CommerceGuestPass_policy_snapshot_check" CHECK (jsonb_typeof("policySnapshot") = 'object')
);
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceGuestPass_scope_idempotency_key" ON "CommerceGuestPass" USING btree ("organizationId", "idempotencyKey");
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceGuestPass_organization_id_key" ON "CommerceGuestPass" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceGuestPass_exact_scope_id_key" ON "CommerceGuestPass" USING btree ("organizationId", "scopeKey", "id");
--> statement-breakpoint
CREATE INDEX "CommerceGuestPass_owner_status_idx" ON "CommerceGuestPass" USING btree ("organizationId", "locationId", "ownerClientId", "status");
--> statement-breakpoint
CREATE INDEX "CommerceGuestPass_expiry_idx" ON "CommerceGuestPass" USING btree ("organizationId", "expiresAt");
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ADD CONSTRAINT "CommerceGuestPass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ADD CONSTRAINT "CommerceGuestPass_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ADD CONSTRAINT "CommerceGuestPass_scope_ownerClientId_fkey" FOREIGN KEY ("organizationId", "ownerClientId") REFERENCES "public"."Client"("organizationId", "id") ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ADD CONSTRAINT "CommerceGuestPass_scope_policyVersionId_fkey" FOREIGN KEY ("organizationId", "scopeKey", "policyVersionId") REFERENCES "public"."CommerceGuestPassPolicyVersion"("organizationId", "scopeKey", "id") ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ADD CONSTRAINT "CommerceGuestPass_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ADD CONSTRAINT "CommerceGuestPass_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPass" ADD CONSTRAINT "CommerceGuestPass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
CREATE TABLE "CommerceGuestPassRedemption" (
	"id" text PRIMARY KEY NOT NULL,
	"guestPassId" text NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"scopeKey" text GENERATED ALWAYS AS (CASE WHEN "locationId" IS NULL THEN 'ORG' ELSE 'LOC:' || "locationId" END) STORED NOT NULL,
	"bookingReference" text,
	"idempotencyKey" text NOT NULL,
	"redeemedById" text,
	"redeemedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CommerceGuestPassRedemption" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceGuestPassRedemption_scope_idempotency_key" ON "CommerceGuestPassRedemption" USING btree ("organizationId", "idempotencyKey");
--> statement-breakpoint
CREATE INDEX "CommerceGuestPassRedemption_pass_redeemedAt_idx" ON "CommerceGuestPassRedemption" USING btree ("guestPassId", "redeemedAt");
--> statement-breakpoint
ALTER TABLE "CommerceGuestPassRedemption" ADD CONSTRAINT "CommerceGuestPassRedemption_scope_guestPassId_fkey" FOREIGN KEY ("organizationId", "scopeKey", "guestPassId") REFERENCES "public"."CommerceGuestPass"("organizationId", "scopeKey", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPassRedemption" ADD CONSTRAINT "CommerceGuestPassRedemption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPassRedemption" ADD CONSTRAINT "CommerceGuestPassRedemption_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommerceGuestPassRedemption" ADD CONSTRAINT "CommerceGuestPassRedemption_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
CREATE FUNCTION "enforce_commerce_guest_pass_owner_scope"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Client" AS owner
    WHERE owner."id" = NEW."ownerClientId"
      AND owner."organizationId" = NEW."organizationId"
      AND owner."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Commerce guest pass contains a cross-scope owner';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "CommerceGuestPass_owner_scope_integrity"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "ownerClientId"
ON "CommerceGuestPass"
FOR EACH ROW EXECUTE FUNCTION "enforce_commerce_guest_pass_owner_scope"();
--> statement-breakpoint
CREATE FUNCTION "protect_commerce_guest_pass_owner_scope"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."organizationId" IS NOT DISTINCT FROM NEW."organizationId"
    AND OLD."locationId" IS NOT DISTINCT FROM NEW."locationId" THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CommerceGuestPass" AS pass
    WHERE pass."ownerClientId" = OLD."id"
      AND pass."organizationId" = OLD."organizationId"
      AND pass."locationId" IS NOT DISTINCT FROM OLD."locationId"
  ) THEN
    RAISE EXCEPTION 'A client with guest passes cannot move between scopes';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "Client_guest_pass_owner_scope_protect"
BEFORE UPDATE OF "organizationId", "locationId"
ON "Client"
FOR EACH ROW EXECUTE FUNCTION "protect_commerce_guest_pass_owner_scope"();
