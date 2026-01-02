-- CreateEnum
CREATE TYPE "WebVitalMetric" AS ENUM ('LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'FID');

-- CreateEnum
CREATE TYPE "WebVitalRating" AS ENUM ('GOOD', 'NEEDS_IMPROVEMENT', 'POOR');

-- AlterTable
ALTER TABLE "FunnelSession" ADD COLUMN     "consentGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentTimestamp" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT DEFAULT '1.0';

-- AlterTable
ALTER TABLE "anonymous_user_profiles" ADD COLUMN     "consentGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentTimestamp" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT DEFAULT '1.0',
ADD COLUMN     "dataRetentionDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FunnelWebVital" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "sessionId" TEXT NOT NULL,
    "anonymousId" TEXT,
    "pageUrl" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "pageTitle" TEXT,
    "metric" "WebVitalMetric" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" "WebVitalRating" NOT NULL,
    "delta" DOUBLE PRECISION,
    "id_metric" TEXT,
    "deviceType" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "countryCode" TEXT,
    "countryName" TEXT,
    "region" TEXT,
    "city" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelWebVital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunnelWebVital_funnelId_timestamp_idx" ON "FunnelWebVital"("funnelId", "timestamp");

-- CreateIndex
CREATE INDEX "FunnelWebVital_sessionId_idx" ON "FunnelWebVital"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelWebVital_metric_rating_idx" ON "FunnelWebVital"("metric", "rating");

-- CreateIndex
CREATE INDEX "FunnelWebVital_subaccountId_timestamp_idx" ON "FunnelWebVital"("subaccountId", "timestamp");

-- CreateIndex
CREATE INDEX "FunnelWebVital_anonymousId_idx" ON "FunnelWebVital"("anonymousId");

-- CreateIndex
CREATE INDEX "FunnelWebVital_pageUrl_metric_idx" ON "FunnelWebVital"("pageUrl", "metric");

-- CreateIndex
CREATE INDEX "FunnelSession_consentGiven_idx" ON "FunnelSession"("consentGiven");

-- CreateIndex
CREATE INDEX "anonymous_user_profiles_consentGiven_idx" ON "anonymous_user_profiles"("consentGiven");

-- CreateIndex
CREATE INDEX "anonymous_user_profiles_deletionRequestedAt_idx" ON "anonymous_user_profiles"("deletionRequestedAt");

-- AddForeignKey
ALTER TABLE "FunnelWebVital" ADD CONSTRAINT "FunnelWebVital_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FunnelSession"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;
