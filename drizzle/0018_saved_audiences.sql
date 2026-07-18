CREATE TABLE "SavedAudience" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"name" text NOT NULL,
	"description" text,
	"definition" jsonb NOT NULL,
	"schemaVersion" integer DEFAULT 1 NOT NULL,
	"createdById" text,
	"updatedById" text,
	"archivedById" text,
	"archivedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SavedAudience" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "SavedAudience_scope_archivedAt_idx" ON "SavedAudience" USING btree ("organizationId", "locationId", "archivedAt");
--> statement-breakpoint
CREATE INDEX "SavedAudience_scope_updatedAt_idx" ON "SavedAudience" USING btree ("organizationId", "locationId", "updatedAt");
--> statement-breakpoint
ALTER TABLE "SavedAudience" ADD CONSTRAINT "SavedAudience_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "SavedAudience" ADD CONSTRAINT "SavedAudience_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "SavedAudience" ADD CONSTRAINT "SavedAudience_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "SavedAudience" ADD CONSTRAINT "SavedAudience_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "SavedAudience" ADD CONSTRAINT "SavedAudience_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
