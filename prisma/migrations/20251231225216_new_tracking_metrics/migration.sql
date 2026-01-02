-- AlterTable
ALTER TABLE "FunnelEvent" ADD COLUMN     "abTestId" TEXT,
ADD COLUMN     "abTestVariant" TEXT,
ADD COLUMN     "customDimensions" JSONB,
ADD COLUMN     "engagementLevel" TEXT,
ADD COLUMN     "engagementScore" DOUBLE PRECISION,
ADD COLUMN     "eventSource" TEXT,
ADD COLUMN     "firstTouchTimestamp" TIMESTAMP(3),
ADD COLUMN     "firstTouchUtmCampaign" TEXT,
ADD COLUMN     "firstTouchUtmContent" TEXT,
ADD COLUMN     "firstTouchUtmMedium" TEXT,
ADD COLUMN     "firstTouchUtmSource" TEXT,
ADD COLUMN     "firstTouchUtmTerm" TEXT,
ADD COLUMN     "lastTouchTimestamp" TIMESTAMP(3),
ADD COLUMN     "lastTouchUtmCampaign" TEXT,
ADD COLUMN     "lastTouchUtmContent" TEXT,
ADD COLUMN     "lastTouchUtmMedium" TEXT,
ADD COLUMN     "lastTouchUtmSource" TEXT,
ADD COLUMN     "lastTouchUtmTerm" TEXT,
ADD COLUMN     "leadScore" DOUBLE PRECISION,
ADD COLUMN     "leadScoreGrade" TEXT;

-- CreateIndex
CREATE INDEX "FunnelEvent_abTestId_idx" ON "FunnelEvent"("abTestId");

-- CreateIndex
CREATE INDEX "FunnelEvent_leadScoreGrade_idx" ON "FunnelEvent"("leadScoreGrade");
