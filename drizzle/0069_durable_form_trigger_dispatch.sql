ALTER TABLE "FormSubmission"
  ADD COLUMN "triggerDispatchStatus" text,
  ADD COLUMN "triggerDispatchAttempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "triggerDispatchError" text,
  ADD COLUMN "lastTriggerDispatchAttemptAt" timestamp(3),
  ADD COLUMN "triggerDispatchedAt" timestamp(3);

CREATE INDEX "FormSubmission_triggerDispatchStatus_submittedAt_idx"
  ON "FormSubmission" USING btree ("triggerDispatchStatus" text_ops, "submittedAt" timestamp_ops);
