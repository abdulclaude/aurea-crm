ALTER TYPE "public"."StudioPaymentType" ADD VALUE IF NOT EXISTS 'ACCOUNT_CREDIT';--> statement-breakpoint
CREATE TYPE "public"."ClientAccountCreditTransactionType" AS ENUM('PURCHASE', 'REDEMPTION', 'ADJUSTMENT', 'IMPORT', 'REFUND');--> statement-breakpoint
CREATE TABLE "ClientAccountBalance" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"clientId" text NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ClientAccountCreditTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"clientId" text NOT NULL,
	"balanceId" text NOT NULL,
	"paymentId" text,
	"pricingOptionId" text,
	"type" "ClientAccountCreditTransactionType" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ClientAccountBalance_clientId_idx" ON "ClientAccountBalance" USING btree ("clientId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountBalance_locationId_idx" ON "ClientAccountBalance" USING btree ("locationId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountBalance_organizationId_idx" ON "ClientAccountBalance" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ClientAccountBalance_organizationId_locationId_clientId_key" ON "ClientAccountBalance" USING btree ("organizationId" text_ops, "locationId" text_ops, "clientId" text_ops) WHERE "locationId" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ClientAccountBalance_organizationId_global_clientId_key" ON "ClientAccountBalance" USING btree ("organizationId" text_ops, "clientId" text_ops) WHERE "locationId" IS NULL;--> statement-breakpoint
CREATE INDEX "ClientAccountCreditTransaction_balanceId_idx" ON "ClientAccountCreditTransaction" USING btree ("balanceId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountCreditTransaction_clientId_idx" ON "ClientAccountCreditTransaction" USING btree ("clientId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountCreditTransaction_locationId_idx" ON "ClientAccountCreditTransaction" USING btree ("locationId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountCreditTransaction_organizationId_idx" ON "ClientAccountCreditTransaction" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountCreditTransaction_paymentId_idx" ON "ClientAccountCreditTransaction" USING btree ("paymentId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountCreditTransaction_pricingOptionId_idx" ON "ClientAccountCreditTransaction" USING btree ("pricingOptionId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientAccountCreditTransaction_type_idx" ON "ClientAccountCreditTransaction" USING btree ("type" enum_ops);--> statement-breakpoint
ALTER TABLE "ClientAccountBalance" ADD CONSTRAINT "ClientAccountBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountBalance" ADD CONSTRAINT "ClientAccountBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountBalance" ADD CONSTRAINT "ClientAccountBalance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountCreditTransaction" ADD CONSTRAINT "ClientAccountCreditTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountCreditTransaction" ADD CONSTRAINT "ClientAccountCreditTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountCreditTransaction" ADD CONSTRAINT "ClientAccountCreditTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountCreditTransaction" ADD CONSTRAINT "ClientAccountCreditTransaction_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "public"."ClientAccountBalance"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountCreditTransaction" ADD CONSTRAINT "ClientAccountCreditTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."StudioPayment"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientAccountCreditTransaction" ADD CONSTRAINT "ClientAccountCreditTransaction_pricingOptionId_fkey" FOREIGN KEY ("pricingOptionId") REFERENCES "public"."PricingOption"("id") ON DELETE set null ON UPDATE cascade;
