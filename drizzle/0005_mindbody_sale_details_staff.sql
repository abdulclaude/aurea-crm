CREATE TABLE "StudioBookingPayment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"bookingId" text NOT NULL,
	"paymentId" text,
	"lineItemId" text,
	"visitRefNo" text NOT NULL,
	"mindbodyPmtRefNo" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioPaymentLineItem" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"paymentId" text,
	"clientId" text,
	"productId" text,
	"externalId" text,
	"saleId" text,
	"mindbodyPmtRefNo" text,
	"productExternalId" text,
	"description" text,
	"category" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitPrice" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"returned" boolean DEFAULT false NOT NULL,
	"soldAt" timestamp (3),
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "StudioPaymentLineItem" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StudioStaffMember" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"externalId" text,
	"employeeId" text,
	"firstName" text,
	"lastName" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text,
	"staffType" text DEFAULT 'TEAM_MEMBER' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"isIntegrationAccount" boolean DEFAULT false NOT NULL,
	"canTeachClasses" boolean DEFAULT false NOT NULL,
	"canTakeAppointments" boolean DEFAULT false NOT NULL,
	"canHandleReservations" boolean DEFAULT false NOT NULL,
	"canLeadWorkshops" boolean DEFAULT false NOT NULL,
	"hourlyRate" numeric(10, 2),
	"currency" text DEFAULT 'GBP',
	"employmentStart" timestamp (3),
	"employmentEnd" timestamp (3),
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "StudioStaffMember" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ADD CONSTRAINT "StudioBookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."StudioBooking"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ADD CONSTRAINT "StudioBookingPayment_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "public"."StudioPaymentLineItem"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ADD CONSTRAINT "StudioBookingPayment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ADD CONSTRAINT "StudioBookingPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ADD CONSTRAINT "StudioBookingPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."StudioPayment"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentLineItem" ADD CONSTRAINT "StudioPaymentLineItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentLineItem" ADD CONSTRAINT "StudioPaymentLineItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentLineItem" ADD CONSTRAINT "StudioPaymentLineItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentLineItem" ADD CONSTRAINT "StudioPaymentLineItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."StudioPayment"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioPaymentLineItem" ADD CONSTRAINT "StudioPaymentLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."StudioProduct"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioStaffMember" ADD CONSTRAINT "StudioStaffMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioStaffMember" ADD CONSTRAINT "StudioStaffMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "StudioBookingPayment_bookingId_idx" ON "StudioBookingPayment" USING btree ("bookingId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBookingPayment_lineItemId_idx" ON "StudioBookingPayment" USING btree ("lineItemId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBookingPayment_locationId_idx" ON "StudioBookingPayment" USING btree ("locationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBookingPayment_mindbodyPmtRefNo_idx" ON "StudioBookingPayment" USING btree ("mindbodyPmtRefNo" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBookingPayment_organizationId_idx" ON "StudioBookingPayment" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBookingPayment_paymentId_idx" ON "StudioBookingPayment" USING btree ("paymentId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StudioBookingPayment_organizationId_visitRefNo_pmtRefNo_key" ON "StudioBookingPayment" USING btree ("organizationId" text_ops,"visitRefNo" text_ops,"mindbodyPmtRefNo" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_clientId_idx" ON "StudioPaymentLineItem" USING btree ("clientId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_locationId_idx" ON "StudioPaymentLineItem" USING btree ("locationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_mindbodyPmtRefNo_idx" ON "StudioPaymentLineItem" USING btree ("mindbodyPmtRefNo" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_organizationId_idx" ON "StudioPaymentLineItem" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_paymentId_idx" ON "StudioPaymentLineItem" USING btree ("paymentId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_productId_idx" ON "StudioPaymentLineItem" USING btree ("productId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_saleId_idx" ON "StudioPaymentLineItem" USING btree ("saleId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioPaymentLineItem_soldAt_idx" ON "StudioPaymentLineItem" USING btree ("soldAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StudioPaymentLineItem_organizationId_externalId_key" ON "StudioPaymentLineItem" USING btree ("organizationId" text_ops,"externalId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioStaffMember_email_idx" ON "StudioStaffMember" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "StudioStaffMember_isActive_idx" ON "StudioStaffMember" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "StudioStaffMember_locationId_idx" ON "StudioStaffMember" USING btree ("locationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioStaffMember_organizationId_idx" ON "StudioStaffMember" USING btree ("organizationId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioStaffMember_staffType_idx" ON "StudioStaffMember" USING btree ("staffType" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "StudioStaffMember_organizationId_externalId_key" ON "StudioStaffMember" USING btree ("organizationId" text_ops,"externalId" text_ops);