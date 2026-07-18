CREATE TYPE "public"."DemoDataProfile" AS ENUM ('SHOWCASE', 'QA_EXHAUSTIVE');
--> statement-breakpoint
CREATE TYPE "public"."DemoDataRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CLEARING', 'CLEARED');
--> statement-breakpoint
CREATE TABLE "DemoDataRun" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text NOT NULL,
  "profile" "DemoDataProfile" NOT NULL,
  "status" "DemoDataRunStatus" DEFAULT 'RUNNING' NOT NULL,
  "schemaVersion" integer DEFAULT 1 NOT NULL,
  "idempotencyKey" text NOT NULL,
  "requestedByUserId" text,
  "referenceDate" timestamp(3) NOT NULL,
  "counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "errorMessage" text,
  "startedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "completedAt" timestamp(3),
  "failedAt" timestamp(3),
  "clearedAt" timestamp(3),
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "DemoDataRun_idempotencyKey_check" CHECK (char_length("idempotencyKey") BETWEEN 8 AND 128)
);
--> statement-breakpoint
ALTER TABLE "DemoDataRun" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "DemoDataRun_scope_idempotency_key" ON "DemoDataRun" USING btree ("organizationId", "locationId", "idempotencyKey");
--> statement-breakpoint
CREATE UNIQUE INDEX "DemoDataRun_active_scope_key" ON "DemoDataRun" USING btree ("organizationId", "locationId") WHERE "status" IN ('RUNNING', 'CLEARING');
--> statement-breakpoint
CREATE INDEX "DemoDataRun_scope_createdAt_idx" ON "DemoDataRun" USING btree ("organizationId", "locationId", "createdAt" DESC);
--> statement-breakpoint
ALTER TABLE "DemoDataRun" ADD CONSTRAINT "DemoDataRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "DemoDataRun" ADD CONSTRAINT "DemoDataRun_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "public"."Location"("organizationId", "id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "DemoDataRun" ADD CONSTRAINT "DemoDataRun_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE TABLE "DemoDataRecord" (
  "id" text PRIMARY KEY NOT NULL,
  "runId" text NOT NULL,
  "recordType" text NOT NULL,
  "recordId" text NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "DemoDataRecord_recordType_check" CHECK (char_length("recordType") BETWEEN 1 AND 100)
);
--> statement-breakpoint
ALTER TABLE "DemoDataRecord" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "DemoDataRecord_type_record_key" ON "DemoDataRecord" USING btree ("recordType", "recordId");
--> statement-breakpoint
CREATE INDEX "DemoDataRecord_run_type_idx" ON "DemoDataRecord" USING btree ("runId", "recordType");
--> statement-breakpoint
ALTER TABLE "DemoDataRecord" ADD CONSTRAINT "DemoDataRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."DemoDataRun"("id") ON DELETE cascade ON UPDATE cascade;
