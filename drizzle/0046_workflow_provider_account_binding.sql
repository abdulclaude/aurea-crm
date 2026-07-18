ALTER TABLE "Node" ADD COLUMN "providerAccountId" text;
--> statement-breakpoint
CREATE INDEX "Node_providerAccountId_idx" ON "Node" USING btree ("providerAccountId");
--> statement-breakpoint
ALTER TABLE "Node" ADD CONSTRAINT "Node_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "public"."ProviderAccount"("id") ON DELETE set null ON UPDATE cascade;
