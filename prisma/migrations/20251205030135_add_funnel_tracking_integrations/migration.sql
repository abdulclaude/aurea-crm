-- CreateEnum
CREATE TYPE "PixelProvider" AS ENUM ('META_PIXEL', 'GOOGLE_ANALYTICS', 'TIKTOK_PIXEL', 'CUSTOM');

-- CreateTable
CREATE TABLE "funnel_pixel_integration" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "provider" "PixelProvider" NOT NULL,
    "pixelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_pixel_integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_block_event" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT,
    "parameters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_block_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_analytics" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_block_analytics" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagementTime" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_block_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funnel_pixel_integration_funnelId_idx" ON "funnel_pixel_integration"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_pixel_integration_funnelId_provider_key" ON "funnel_pixel_integration"("funnelId", "provider");

-- CreateIndex
CREATE INDEX "funnel_block_event_blockId_idx" ON "funnel_block_event"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_block_event_blockId_key" ON "funnel_block_event"("blockId");

-- CreateIndex
CREATE INDEX "funnel_analytics_funnelId_date_idx" ON "funnel_analytics"("funnelId", "date");

-- CreateIndex
CREATE INDEX "funnel_analytics_pageId_date_idx" ON "funnel_analytics"("pageId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_analytics_funnelId_pageId_date_key" ON "funnel_analytics"("funnelId", "pageId", "date");

-- CreateIndex
CREATE INDEX "funnel_block_analytics_blockId_date_idx" ON "funnel_block_analytics"("blockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_block_analytics_blockId_date_key" ON "funnel_block_analytics"("blockId", "date");

-- AddForeignKey
ALTER TABLE "funnel_pixel_integration" ADD CONSTRAINT "funnel_pixel_integration_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_block_event" ADD CONSTRAINT "funnel_block_event_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "funnel_block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_analytics" ADD CONSTRAINT "funnel_analytics_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_analytics" ADD CONSTRAINT "funnel_analytics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "funnel_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_block_analytics" ADD CONSTRAINT "funnel_block_analytics_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "funnel_block"("id") ON DELETE CASCADE ON UPDATE CASCADE;
