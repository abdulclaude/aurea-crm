DELETE FROM "Notification"
WHERE "type" IN (
  'FUNNEL_CREATED',
  'FUNNEL_UPDATED',
  'FUNNEL_PUBLISHED',
  'FUNNEL_DELETED'
);

UPDATE "NotificationPreference"
SET "preferences" = "preferences" - ARRAY[
  'FUNNEL_CREATED',
  'FUNNEL_UPDATED',
  'FUNNEL_PUBLISHED',
  'FUNNEL_DELETED'
]::text[]
WHERE "preferences" ?| ARRAY[
  'FUNNEL_CREATED',
  'FUNNEL_UPDATED',
  'FUNNEL_PUBLISHED',
  'FUNNEL_DELETED'
];

DELETE FROM "Activity" WHERE "type" = 'FUNNEL';
DELETE FROM "PublicationTarget" WHERE "kind" = 'FUNNEL';

DROP FUNCTION IF EXISTS enforce_ad_conversion_delivery_event_scope() CASCADE;
DROP FUNCTION IF EXISTS enforce_ad_conversion_delivery_account_scope() CASCADE;
DROP FUNCTION IF EXISTS "assert_funnel_session_scope"() CASCADE;
DROP FUNCTION IF EXISTS "assert_funnel_tracking_location_scope"() CASCADE;

DROP TABLE IF EXISTS "AdConversionDelivery";
DELETE FROM "ProviderAccount"
WHERE "provider" IN ('META_CONVERSIONS', 'GOOGLE_ADS', 'TIKTOK_EVENTS');
DROP TABLE IF EXISTS "FunnelWebVital";
DROP TABLE IF EXISTS "FunnelEvent";
DROP TABLE IF EXISTS "FunnelSession";
DROP TABLE IF EXISTS "anonymous_user_profiles";
DROP TABLE IF EXISTS "ExternalFormSubmission";
DROP TABLE IF EXISTS "FunnelRequestQuota";
DROP TABLE IF EXISTS "FunnelBlockAnalytics";
DROP TABLE IF EXISTS "FunnelBlockEvent";
DROP TABLE IF EXISTS "FunnelBreakpoint";
DROP TABLE IF EXISTS "FunnelBlock";
ALTER TABLE "SmartSectionInstance" DROP COLUMN IF EXISTS "funnelPageId";
DROP TABLE IF EXISTS "FunnelAnalytics";
DROP TABLE IF EXISTS "FunnelPixelIntegration";
DROP TABLE IF EXISTS "FunnelPage";

ALTER TABLE "AdSpend" DROP COLUMN IF EXISTS "funnelId";
DROP TABLE IF EXISTS "Funnel";

ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
CREATE TYPE "ActivityType" AS ENUM (
  'CLIENT',
  'DEAL',
  'WORKFLOW',
  'EXECUTION',
  'PIPELINE',
  'TASK',
  'EMAIL',
  'CALL',
  'MEETING',
  'NOTE',
  'INSTRUCTOR',
  'TIME_LOG',
  'INVOICE',
  'CREDENTIAL',
  'WEBHOOK',
  'INTEGRATION',
  'LOCATION',
  'ORGANIZATION',
  'BOOKING',
  'CAMPAIGN'
);
ALTER TABLE "Activity"
  ALTER COLUMN "type" TYPE "ActivityType"
  USING "type"::text::"ActivityType";
DROP TYPE "ActivityType_old";

DROP TRIGGER IF EXISTS "PublicationTarget_widget_scope_guard"
ON "PublicationTarget";
ALTER TYPE "PublicationTargetKind" RENAME TO "PublicationTargetKind_old";
CREATE TYPE "PublicationTargetKind" AS ENUM (
  'SCHEDULE',
  'PRICING',
  'FORM',
  'GIFT_CARDS',
  'WIDGET'
);
ALTER TABLE "PublicationTarget"
  ALTER COLUMN "kind" TYPE "PublicationTargetKind"
  USING "kind"::text::"PublicationTargetKind";
DROP TYPE "PublicationTargetKind_old";
CREATE TRIGGER "PublicationTarget_widget_scope_guard"
BEFORE INSERT OR UPDATE OF "kind", "sourceId", "sourceKey", "organizationId", "locationId"
ON "PublicationTarget"
FOR EACH ROW
EXECUTE FUNCTION validate_widget_publication_scope();

DROP TYPE IF EXISTS "AdConversionDeliveryStatus";
DROP TYPE IF EXISTS "DeviceType";
DROP TYPE IF EXISTS "FunnelBlockType";
DROP TYPE IF EXISTS "FunnelDomainType";
DROP TYPE IF EXISTS "FunnelStatus";
DROP TYPE IF EXISTS "FunnelType";
DROP TYPE IF EXISTS "PixelProvider";
DROP TYPE IF EXISTS "WebVitalMetric";
DROP TYPE IF EXISTS "WebVitalRating";
