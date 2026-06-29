CREATE TABLE "ExternalFormSubmission" (
	"id" text PRIMARY KEY NOT NULL,
	"funnelId" text NOT NULL,
	"organizationId" text NOT NULL,
	"locationId" text,
	"formId" text,
	"formKey" text NOT NULL,
	"formName" text,
	"formType" text,
	"formVersion" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"qualified" boolean,
	"score" double precision,
	"reasonCodes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"data" jsonb NOT NULL,
	"normalized" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sessionId" text,
	"anonymousId" text,
	"userId" text,
	"pageUrl" text,
	"pagePath" text,
	"pageTitle" text,
	"referrer" text,
	"utmSource" text,
	"utmMedium" text,
	"utmCampaign" text,
	"utmTerm" text,
	"utmContent" text,
	"firstTouchUtm" jsonb,
	"lastTouchUtm" jsonb,
	"clickIds" jsonb,
	"cookies" jsonb,
	"device" jsonb,
	"ipAddress" text,
	"userAgent" text,
	"submittedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_anonymousId_idx" ON "ExternalFormSubmission" USING btree ("anonymousId" text_ops);
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_formKey_idx" ON "ExternalFormSubmission" USING btree ("formKey" text_ops);
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_funnelId_submittedAt_idx" ON "ExternalFormSubmission" USING btree ("funnelId" text_ops,"submittedAt" timestamp_ops);
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_locationId_submittedAt_idx" ON "ExternalFormSubmission" USING btree ("locationId" text_ops,"submittedAt" timestamp_ops);
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_organizationId_idx" ON "ExternalFormSubmission" USING btree ("organizationId" text_ops);
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_qualified_idx" ON "ExternalFormSubmission" USING btree ("qualified" bool_ops);
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_sessionId_idx" ON "ExternalFormSubmission" USING btree ("sessionId" text_ops);
--> statement-breakpoint
CREATE INDEX "ExternalFormSubmission_status_idx" ON "ExternalFormSubmission" USING btree ("status" text_ops);
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD CONSTRAINT "ExternalFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD CONSTRAINT "ExternalFormSubmission_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."Funnel"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD CONSTRAINT "ExternalFormSubmission_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "ExternalFormSubmission" ADD CONSTRAINT "ExternalFormSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
