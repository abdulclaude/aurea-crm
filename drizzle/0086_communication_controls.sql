CREATE TABLE "CommunicationRule" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"scopeKey" text GENERATED ALWAYS AS (CASE WHEN "locationId" IS NULL THEN 'ORG' ELSE 'LOC:' || "locationId" END) STORED NOT NULL,
	"name" text NOT NULL,
	"eventKey" text NOT NULL,
	"channel" "DeliveryChannel" NOT NULL,
	"purpose" "DeliveryPurpose" NOT NULL,
	"currentVersion" integer DEFAULT 0 NOT NULL,
	"archivedAt" timestamp(3),
	"archivedById" text,
	"createdById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "CommunicationRule_currentVersion_check" CHECK ("currentVersion" >= 0),
	CONSTRAINT "CommunicationRule_channel_check" CHECK ("channel" IN ('EMAIL', 'SMS')),
	CONSTRAINT "CommunicationRule_eventKey_check" CHECK ("eventKey" ~ '^[a-z][a-z0-9_.-]{1,119}$')
);
--> statement-breakpoint
ALTER TABLE "CommunicationRule" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationRule_active_org_event_channel_key" ON "CommunicationRule" USING btree ("organizationId", "eventKey", "channel") WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationRule_active_location_event_channel_key" ON "CommunicationRule" USING btree ("organizationId", "locationId", "eventKey", "channel") WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationRule_organization_id_key" ON "CommunicationRule" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationRule_exact_scope_id_key" ON "CommunicationRule" USING btree ("organizationId", "scopeKey", "id");
--> statement-breakpoint
ALTER TABLE "CommunicationRule" ADD CONSTRAINT "CommunicationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommunicationRule" ADD CONSTRAINT "CommunicationRule_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommunicationRule" ADD CONSTRAINT "CommunicationRule_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommunicationRule" ADD CONSTRAINT "CommunicationRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
CREATE TABLE "CommunicationRuleVersion" (
	"id" text PRIMARY KEY NOT NULL,
	"ruleId" text NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"scopeKey" text GENERATED ALWAYS AS (CASE WHEN "locationId" IS NULL THEN 'ORG' ELSE 'LOC:' || "locationId" END) STORED NOT NULL,
	"version" integer NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"scheduleOffsetMinutes" integer DEFAULT 0 NOT NULL,
	"subject" text,
	"textBody" text,
	"htmlBody" text,
	"changeNote" text,
	"createdById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "CommunicationRuleVersion_version_check" CHECK ("version" > 0),
	CONSTRAINT "CommunicationRuleVersion_scheduleOffset_check" CHECK ("scheduleOffsetMinutes" BETWEEN -525600 AND 525600),
	CONSTRAINT "CommunicationRuleVersion_content_check" CHECK ("subject" IS NOT NULL OR "textBody" IS NOT NULL OR "htmlBody" IS NOT NULL),
	CONSTRAINT "CommunicationRuleVersion_note_check" CHECK ("changeNote" IS NULL OR length("changeNote") <= 240)
);
--> statement-breakpoint
ALTER TABLE "CommunicationRuleVersion" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationRuleVersion_rule_version_key" ON "CommunicationRuleVersion" USING btree ("ruleId", "version");
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationRuleVersion_organization_id_key" ON "CommunicationRuleVersion" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "CommunicationRuleVersion_org_rule_id_key" ON "CommunicationRuleVersion" USING btree ("organizationId", "ruleId", "id");
--> statement-breakpoint
CREATE INDEX "CommunicationRuleVersion_scope_createdAt_idx" ON "CommunicationRuleVersion" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
ALTER TABLE "CommunicationRuleVersion" ADD CONSTRAINT "CommunicationRuleVersion_scope_rule_fkey" FOREIGN KEY ("organizationId", "scopeKey", "ruleId") REFERENCES "public"."CommunicationRule"("organizationId", "scopeKey", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommunicationRuleVersion" ADD CONSTRAINT "CommunicationRuleVersion_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "CommunicationRuleVersion" ADD CONSTRAINT "CommunicationRuleVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
CREATE TABLE "MailboxBlocklistEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"matchType" text NOT NULL,
	"valueNormalized" text NOT NULL,
	"reason" text NOT NULL,
	"expiresAt" timestamp(3),
	"revokedAt" timestamp(3),
	"createdById" text,
	"revokedById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "MailboxBlocklistEntry_matchType_check" CHECK ("matchType" IN ('ADDRESS', 'DOMAIN')),
	CONSTRAINT "MailboxBlocklistEntry_reason_check" CHECK (length("reason") BETWEEN 1 AND 500)
);
--> statement-breakpoint
ALTER TABLE "MailboxBlocklistEntry" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "MailboxBlocklistEntry_active_org_value_key" ON "MailboxBlocklistEntry" USING btree ("organizationId", "matchType", "valueNormalized") WHERE "locationId" IS NULL AND "revokedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "MailboxBlocklistEntry_active_location_value_key" ON "MailboxBlocklistEntry" USING btree ("organizationId", "locationId", "matchType", "valueNormalized") WHERE "locationId" IS NOT NULL AND "revokedAt" IS NULL;
--> statement-breakpoint
CREATE INDEX "MailboxBlocklistEntry_scope_value_idx" ON "MailboxBlocklistEntry" USING btree ("organizationId", "locationId", "valueNormalized");
--> statement-breakpoint
ALTER TABLE "MailboxBlocklistEntry" ADD CONSTRAINT "MailboxBlocklistEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "MailboxBlocklistEntry" ADD CONSTRAINT "MailboxBlocklistEntry_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "MailboxBlocklistEntry" ADD CONSTRAINT "MailboxBlocklistEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "MailboxBlocklistEntry" ADD CONSTRAINT "MailboxBlocklistEntry_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD COLUMN "communicationRuleId" text;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD COLUMN "communicationRuleVersionId" text;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD COLUMN "communicationRuleSnapshot" jsonb;
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_communicationRuleVersionId_idx" ON "OutboundDelivery" USING btree ("communicationRuleVersionId");
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_scope_communicationRule_fkey" FOREIGN KEY ("organizationId", "communicationRuleId") REFERENCES "public"."CommunicationRule"("organizationId", "id") ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_scope_communicationRuleVersion_fkey" FOREIGN KEY ("organizationId", "communicationRuleId", "communicationRuleVersionId") REFERENCES "public"."CommunicationRuleVersion"("organizationId", "ruleId", "id") ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_communicationRuleSnapshot_check" CHECK ("communicationRuleSnapshot" IS NULL OR jsonb_typeof("communicationRuleSnapshot") = 'object');
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_communicationRuleBinding_check" CHECK (("communicationRuleId" IS NULL AND "communicationRuleVersionId" IS NULL AND "communicationRuleSnapshot" IS NULL) OR ("communicationRuleId" IS NOT NULL AND "communicationRuleVersionId" IS NOT NULL AND "communicationRuleSnapshot" IS NOT NULL));
--> statement-breakpoint
CREATE FUNCTION "enforce_outbound_delivery_communication_scope"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."communicationRuleId" IS NULL OR NEW."communicationRuleVersionId" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "CommunicationRule" AS rule
    INNER JOIN "CommunicationRuleVersion" AS version
      ON version."ruleId" = rule."id"
      AND version."organizationId" = rule."organizationId"
      AND version."locationId" IS NOT DISTINCT FROM rule."locationId"
    WHERE rule."id" = NEW."communicationRuleId"
      AND version."id" = NEW."communicationRuleVersionId"
      AND rule."organizationId" = NEW."organizationId"
      AND rule."locationId" IS NOT DISTINCT FROM NEW."locationId"
  ) THEN
    RAISE EXCEPTION 'Outbound delivery contains a cross-scope communication rule binding';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "OutboundDelivery_communication_scope_integrity"
BEFORE INSERT OR UPDATE OF "organizationId", "locationId", "communicationRuleId", "communicationRuleVersionId"
ON "OutboundDelivery"
FOR EACH ROW EXECUTE FUNCTION "enforce_outbound_delivery_communication_scope"();
