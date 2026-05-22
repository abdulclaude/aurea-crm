DROP INDEX "AutomationEvent_organizationId_occurredAt_idx";--> statement-breakpoint
DROP INDEX "AutomationEvent_type_occurredAt_idx";--> statement-breakpoint
DROP INDEX "FunnelBlock_pageId_order_idx";--> statement-breakpoint
DROP INDEX "FunnelBlock_pageId_parentBlockId_order_idx";--> statement-breakpoint
DROP INDEX "FunnelBlock_smartSectionId_order_idx";--> statement-breakpoint
DROP INDEX "FunnelEvent_isConversion_funnelId_idx";--> statement-breakpoint
DROP INDEX "FunnelEvent_userId_timestamp_idx";--> statement-breakpoint
DROP INDEX "FunnelPage_funnelId_order_idx";--> statement-breakpoint
DROP INDEX "FunnelSession_converted_funnelId_idx";--> statement-breakpoint
DROP INDEX "FunnelSession_funnelId_startedAt_idx";--> statement-breakpoint
DROP INDEX "FunnelWebVital_locationId_timestamp_idx";--> statement-breakpoint
DROP INDEX "InboxConversation_organizationId_locationId_isRead_idx";--> statement-breakpoint
DROP INDEX "InstructorAvailability_instructorId_dayOfWeek_isActive_idx";--> statement-breakpoint
DROP INDEX "LocationModule_locationId_enabled_idx";--> statement-breakpoint
DROP INDEX "OvertimeTracking_instructorId_weekStartDate_idx";--> statement-breakpoint
DROP INDEX "PerformanceMetric_clientId_recordedAt_idx";--> statement-breakpoint
DROP INDEX "PipelineStage_pipelineId_position_key";--> statement-breakpoint
DROP INDEX "Rota_organizationId_instructorId_startTime_idx";--> statement-breakpoint
DROP INDEX "SoapNote_clientId_createdAt_idx";--> statement-breakpoint
DROP INDEX "Spot_layoutId_row_col_key";--> statement-breakpoint
DROP INDEX "TimeLog_organizationId_startTime_idx";--> statement-breakpoint
CREATE INDEX "AutomationEvent_organizationId_occurredAt_idx" ON "AutomationEvent" USING btree ("organizationId" text_ops,"occurredAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "AutomationEvent_type_occurredAt_idx" ON "AutomationEvent" USING btree ("type" enum_ops,"occurredAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_pageId_order_idx" ON "FunnelBlock" USING btree ("pageId" text_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_pageId_parentBlockId_order_idx" ON "FunnelBlock" USING btree ("pageId" text_ops,"parentBlockId" text_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "FunnelBlock_smartSectionId_order_idx" ON "FunnelBlock" USING btree ("smartSectionId" text_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_isConversion_funnelId_idx" ON "FunnelEvent" USING btree ("isConversion" bool_ops,"funnelId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelEvent_userId_timestamp_idx" ON "FunnelEvent" USING btree ("userId" text_ops,"timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "FunnelPage_funnelId_order_idx" ON "FunnelPage" USING btree ("funnelId" text_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_converted_funnelId_idx" ON "FunnelSession" USING btree ("converted" bool_ops,"funnelId" text_ops);--> statement-breakpoint
CREATE INDEX "FunnelSession_funnelId_startedAt_idx" ON "FunnelSession" USING btree ("funnelId" text_ops,"startedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "FunnelWebVital_locationId_timestamp_idx" ON "FunnelWebVital" USING btree ("locationId" text_ops,"timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "InboxConversation_organizationId_locationId_isRead_idx" ON "InboxConversation" USING btree ("organizationId" text_ops,"locationId" text_ops,"isRead" bool_ops);--> statement-breakpoint
CREATE INDEX "InstructorAvailability_instructorId_dayOfWeek_isActive_idx" ON "InstructorAvailability" USING btree ("instructorId" text_ops,"dayOfWeek" int4_ops,"isActive" bool_ops);--> statement-breakpoint
CREATE INDEX "LocationModule_locationId_enabled_idx" ON "LocationModule" USING btree ("locationId" text_ops,"enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "OvertimeTracking_instructorId_weekStartDate_idx" ON "OvertimeTracking" USING btree ("instructorId" text_ops,"weekStartDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "PerformanceMetric_clientId_recordedAt_idx" ON "PerformanceMetric" USING btree ("clientId" text_ops,"recordedAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "PipelineStage_pipelineId_position_key" ON "PipelineStage" USING btree ("pipelineId" text_ops,"position" int4_ops);--> statement-breakpoint
CREATE INDEX "Rota_organizationId_instructorId_startTime_idx" ON "Rota" USING btree ("organizationId" text_ops,"instructorId" text_ops,"startTime" timestamp_ops);--> statement-breakpoint
CREATE INDEX "SoapNote_clientId_createdAt_idx" ON "SoapNote" USING btree ("clientId" text_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Spot_layoutId_row_col_key" ON "Spot" USING btree ("layoutId" text_ops,"row" int4_ops,"col" int4_ops);--> statement-breakpoint
CREATE INDEX "TimeLog_organizationId_startTime_idx" ON "TimeLog" USING btree ("organizationId" text_ops,"startTime" timestamp_ops);