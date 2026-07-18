ALTER TABLE "Campaign" ADD COLUMN "savedAudienceId" text;
--> statement-breakpoint
CREATE INDEX "Campaign_savedAudienceId_idx" ON "Campaign" USING btree ("savedAudienceId");
--> statement-breakpoint
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_savedAudienceId_fkey" FOREIGN KEY ("savedAudienceId") REFERENCES "public"."SavedAudience"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX "CommerceOperation_providerRefundId_key" ON "CommerceOperation" USING btree ("providerRefundId") WHERE "providerRefundId" IS NOT NULL;
