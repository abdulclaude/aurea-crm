/*
  Warnings:

  - A unique constraint covering the columns `[apiKey]` on the table `Funnel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FunnelType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "Funnel" ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "externalDomains" TEXT[],
ADD COLUMN     "externalMetadata" JSONB,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "funnelType" "FunnelType" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "trackingConfig" JSONB;

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "eventName" TEXT NOT NULL,
    "eventProperties" JSONB NOT NULL DEFAULT '{}',
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "pageUrl" TEXT,
    "pagePath" TEXT,
    "pageTitle" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "ipAddress" TEXT,
    "countryCode" TEXT,
    "region" TEXT,
    "city" TEXT,
    "timezone" TEXT,
    "isConversion" BOOLEAN NOT NULL DEFAULT false,
    "conversionType" TEXT,
    "revenue" DECIMAL(10,2),
    "currency" TEXT,
    "orderId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "userId" TEXT,
    "anonymousId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "firstSource" TEXT,
    "firstMedium" TEXT,
    "firstCampaign" TEXT,
    "firstReferrer" TEXT,
    "firstPageUrl" TEXT,
    "lastSource" TEXT,
    "lastMedium" TEXT,
    "lastCampaign" TEXT,
    "lastPageUrl" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversionValue" DECIMAL(10,2),
    "conversionType" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "countryCode" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunnelEvent_eventId_key" ON "FunnelEvent"("eventId");

-- CreateIndex
CREATE INDEX "FunnelEvent_funnelId_timestamp_idx" ON "FunnelEvent"("funnelId", "timestamp");

-- CreateIndex
CREATE INDEX "FunnelEvent_sessionId_idx" ON "FunnelEvent"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelEvent_userId_timestamp_idx" ON "FunnelEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "FunnelEvent_anonymousId_idx" ON "FunnelEvent"("anonymousId");

-- CreateIndex
CREATE INDEX "FunnelEvent_subaccountId_timestamp_idx" ON "FunnelEvent"("subaccountId", "timestamp");

-- CreateIndex
CREATE INDEX "FunnelEvent_eventName_funnelId_idx" ON "FunnelEvent"("eventName", "funnelId");

-- CreateIndex
CREATE INDEX "FunnelEvent_isConversion_funnelId_idx" ON "FunnelEvent"("isConversion", "funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelSession_sessionId_key" ON "FunnelSession"("sessionId");

-- CreateIndex
CREATE INDEX "FunnelSession_funnelId_startedAt_idx" ON "FunnelSession"("funnelId", "startedAt");

-- CreateIndex
CREATE INDEX "FunnelSession_userId_idx" ON "FunnelSession"("userId");

-- CreateIndex
CREATE INDEX "FunnelSession_subaccountId_startedAt_idx" ON "FunnelSession"("subaccountId", "startedAt");

-- CreateIndex
CREATE INDEX "FunnelSession_converted_funnelId_idx" ON "FunnelSession"("converted", "funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_apiKey_key" ON "Funnel"("apiKey");

-- CreateIndex
CREATE INDEX "Funnel_funnelType_idx" ON "Funnel"("funnelType");

-- CreateIndex
CREATE INDEX "Funnel_apiKey_idx" ON "Funnel"("apiKey");

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
