ALTER TABLE "ClientDocument" ADD COLUMN "paymentId" text;--> statement-breakpoint
ALTER TABLE "ClientDocument" ADD COLUMN "paymentLineItemId" text;--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ADD COLUMN "classCreditId" text;--> statement-breakpoint
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."StudioPayment"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_paymentLineItemId_fkey" FOREIGN KEY ("paymentLineItemId") REFERENCES "public"."StudioPaymentLineItem"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "StudioBookingPayment" ADD CONSTRAINT "StudioBookingPayment_classCreditId_fkey" FOREIGN KEY ("classCreditId") REFERENCES "public"."ClassCredit"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ClientDocument_paymentId_idx" ON "ClientDocument" USING btree ("paymentId" text_ops);--> statement-breakpoint
CREATE INDEX "ClientDocument_paymentLineItemId_idx" ON "ClientDocument" USING btree ("paymentLineItemId" text_ops);--> statement-breakpoint
CREATE INDEX "StudioBookingPayment_classCreditId_idx" ON "StudioBookingPayment" USING btree ("classCreditId" text_ops);