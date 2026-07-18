CREATE TABLE "ProviderAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"provider" text NOT NULL,
	"displayName" text NOT NULL,
	"externalAccountId" text,
	"encryptedSecret" text NOT NULL,
	"encryptedWebhookSecret" text,
	"environment" text DEFAULT 'live' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"isDefault" boolean DEFAULT true NOT NULL,
	"capabilities" text[],
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lastHealthCheckAt" timestamp(3),
	"lastSuccessAt" timestamp(3),
	"lastErrorCode" text,
	"createdByUserId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ProviderAccount" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ProviderAccount" ADD CONSTRAINT "ProviderAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ProviderAccount" ADD CONSTRAINT "ProviderAccount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ProviderAccount" ADD CONSTRAINT "ProviderAccount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "ProviderAccount_scope_provider_idx" ON "ProviderAccount" USING btree ("organizationId","locationId","provider");
--> statement-breakpoint
CREATE UNIQUE INDEX "ProviderAccount_org_default_key" ON "ProviderAccount" USING btree ("organizationId","provider") WHERE "locationId" IS NULL AND "isDefault" = true;
--> statement-breakpoint
CREATE UNIQUE INDEX "ProviderAccount_location_default_key" ON "ProviderAccount" USING btree ("organizationId","locationId","provider") WHERE "locationId" IS NOT NULL AND "isDefault" = true;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD COLUMN "providerAccountId" text;
--> statement-breakpoint
ALTER TABLE "EmailDomain" ADD CONSTRAINT "EmailDomain_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "public"."ProviderAccount"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "EmailDomain_providerAccountId_idx" ON "EmailDomain" USING btree ("providerAccountId");
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD COLUMN "providerAccountId" text;
--> statement-breakpoint
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "public"."ProviderAccount"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "OutboundDelivery_providerAccountId_idx" ON "OutboundDelivery" USING btree ("providerAccountId");
--> statement-breakpoint
ALTER TABLE "DeliveryProviderEvent" ADD COLUMN "providerAccountId" text;
--> statement-breakpoint
ALTER TABLE "DeliveryProviderEvent" ADD CONSTRAINT "DeliveryProviderEvent_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "public"."ProviderAccount"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "DeliveryProviderEvent_providerAccountId_idx" ON "DeliveryProviderEvent" USING btree ("providerAccountId");
--> statement-breakpoint
CREATE UNIQUE INDEX "StripeConnection_organization_default_key" ON "StripeConnection" USING btree ("organizationId") WHERE "locationId" IS NULL;
