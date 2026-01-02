-- AlterTable
ALTER TABLE "FunnelEvent" ADD COLUMN     "funnelStage" TEXT,
ADD COLUMN     "isMicroConversion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "microConversionType" TEXT,
ADD COLUMN     "microConversionValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "FunnelSession" ADD COLUMN     "abandonReason" TEXT,
ADD COLUMN     "abandonedAt" TIMESTAMP(3),
ADD COLUMN     "checkoutCompletedAt" TIMESTAMP(3),
ADD COLUMN     "checkoutDuration" INTEGER,
ADD COLUMN     "checkoutStartedAt" TIMESTAMP(3),
ADD COLUMN     "currentStage" TEXT,
ADD COLUMN     "firstTouchSource" TEXT,
ADD COLUMN     "isAbandoned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastTouchSource" TEXT,
ADD COLUMN     "linkedSessionId" TEXT,
ADD COLUMN     "stageHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "touchpoints" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_linkedSessionId_fkey" FOREIGN KEY ("linkedSessionId") REFERENCES "FunnelSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
