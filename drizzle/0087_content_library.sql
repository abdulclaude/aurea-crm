CREATE TABLE "ContentLibraryItem" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"scopeKey" text GENERATED ALWAYS AS (CASE WHEN "locationId" IS NULL THEN 'ORG' ELSE 'LOC:' || "locationId" END) STORED NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"currentVersion" integer DEFAULT 0 NOT NULL,
	"publishedVersion" integer,
	"publishedAt" timestamp(3),
	"publishedById" text,
	"archivedAt" timestamp(3),
	"archivedById" text,
	"createdById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ContentLibraryItem_kind_check" CHECK ("kind" IN ('TERMINOLOGY_PACK', 'FAQ_COLLECTION', 'MESSAGE_MACRO', 'PUBLIC_PROFILE')),
	CONSTRAINT "ContentLibraryItem_key_check" CHECK ("key" ~ '^[a-z][a-z0-9_-]{1,79}$'),
	CONSTRAINT "ContentLibraryItem_version_check" CHECK ("currentVersion" >= 0 AND ("publishedVersion" IS NULL OR ("publishedVersion" > 0 AND "publishedVersion" <= "currentVersion")))
);
--> statement-breakpoint
ALTER TABLE "ContentLibraryItem" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "ContentLibraryItem_active_org_key" ON "ContentLibraryItem" USING btree ("organizationId", "kind", "key") WHERE "locationId" IS NULL AND "archivedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ContentLibraryItem_active_location_key" ON "ContentLibraryItem" USING btree ("organizationId", "locationId", "kind", "key") WHERE "locationId" IS NOT NULL AND "archivedAt" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ContentLibraryItem_organization_id_key" ON "ContentLibraryItem" USING btree ("organizationId", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ContentLibraryItem_exact_scope_id_key" ON "ContentLibraryItem" USING btree ("organizationId", "scopeKey", "id");
--> statement-breakpoint
CREATE INDEX "ContentLibraryItem_scope_kind_updatedAt_idx" ON "ContentLibraryItem" USING btree ("organizationId", "locationId", "kind", "updatedAt");
--> statement-breakpoint
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "ContentLibraryItem" ADD CONSTRAINT "ContentLibraryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
--> statement-breakpoint
CREATE TABLE "ContentLibraryItemVersion" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"scopeKey" text GENERATED ALWAYS AS (CASE WHEN "locationId" IS NULL THEN 'ORG' ELSE 'LOC:' || "locationId" END) STORED NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"changeNote" text,
	"sourceVersion" integer,
	"createdById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ContentLibraryItemVersion_kind_check" CHECK ("kind" IN ('TERMINOLOGY_PACK', 'FAQ_COLLECTION', 'MESSAGE_MACRO', 'PUBLIC_PROFILE')),
	CONSTRAINT "ContentLibraryItemVersion_version_check" CHECK ("version" > 0),
	CONSTRAINT "ContentLibraryItemVersion_payload_check" CHECK (jsonb_typeof("payload") = 'object'),
	CONSTRAINT "ContentLibraryItemVersion_source_check" CHECK ("sourceVersion" IS NULL OR "sourceVersion" > 0),
	CONSTRAINT "ContentLibraryItemVersion_note_check" CHECK ("changeNote" IS NULL OR length("changeNote") <= 240)
);
--> statement-breakpoint
ALTER TABLE "ContentLibraryItemVersion" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "ContentLibraryItemVersion_item_version_key" ON "ContentLibraryItemVersion" USING btree ("itemId", "version");
--> statement-breakpoint
CREATE INDEX "ContentLibraryItemVersion_scope_createdAt_idx" ON "ContentLibraryItemVersion" USING btree ("organizationId", "locationId", "createdAt");
--> statement-breakpoint
ALTER TABLE "ContentLibraryItemVersion" ADD CONSTRAINT "ContentLibraryItemVersion_scope_item_fkey" FOREIGN KEY ("organizationId", "scopeKey", "itemId") REFERENCES "public"."ContentLibraryItem"("organizationId", "scopeKey", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "ContentLibraryItemVersion" ADD CONSTRAINT "ContentLibraryItemVersion_scope_location_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE "ContentLibraryItemVersion" ADD CONSTRAINT "ContentLibraryItemVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE restrict;
