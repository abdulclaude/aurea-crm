-- AlterTable
ALTER TABLE "FunnelEvent" ADD COLUMN     "cls" DOUBLE PRECISION,
ADD COLUMN     "fcp" DOUBLE PRECISION,
ADD COLUMN     "inp" DOUBLE PRECISION,
ADD COLUMN     "lcp" DOUBLE PRECISION,
ADD COLUMN     "ttfb" DOUBLE PRECISION,
ADD COLUMN     "vitalRating" TEXT;

-- AlterTable
ALTER TABLE "FunnelSession" ADD COLUMN     "activeTimeSeconds" INTEGER,
ADD COLUMN     "avgCls" DOUBLE PRECISION,
ADD COLUMN     "avgFcp" DOUBLE PRECISION,
ADD COLUMN     "avgInp" DOUBLE PRECISION,
ADD COLUMN     "avgLcp" DOUBLE PRECISION,
ADD COLUMN     "avgTtfb" DOUBLE PRECISION,
ADD COLUMN     "engagementRate" DOUBLE PRECISION,
ADD COLUMN     "experienceScore" INTEGER,
ADD COLUMN     "idleTimeSeconds" INTEGER;

-- AlterTable
ALTER TABLE "anonymous_user_profiles" ADD COLUMN     "avgEngagementRate" DOUBLE PRECISION,
ADD COLUMN     "avgExperienceScore" DOUBLE PRECISION,
ADD COLUMN     "identifiedAt" TIMESTAMP(3),
ADD COLUMN     "identifiedUserId" TEXT,
ADD COLUMN     "lifecycleStage" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "userProperties" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "anonymous_user_profiles_identifiedUserId_idx" ON "anonymous_user_profiles"("identifiedUserId");

-- CreateIndex
CREATE INDEX "anonymous_user_profiles_lifecycleStage_idx" ON "anonymous_user_profiles"("lifecycleStage");
