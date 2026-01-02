-- AlterTable
ALTER TABLE "FunnelEvent" ADD COLUMN     "ScCid" TEXT,
ADD COLUMN     "dclid" TEXT,
ADD COLUMN     "epik" TEXT,
ADD COLUMN     "fbc" TEXT,
ADD COLUMN     "fbclid" TEXT,
ADD COLUMN     "fbp" TEXT,
ADD COLUMN     "gbraid" TEXT,
ADD COLUMN     "gclid" TEXT,
ADD COLUMN     "li_fat_id" TEXT,
ADD COLUMN     "msclkid" TEXT,
ADD COLUMN     "rdt_cid" TEXT,
ADD COLUMN     "ttclid" TEXT,
ADD COLUMN     "ttp" TEXT,
ADD COLUMN     "twclid" TEXT,
ADD COLUMN     "wbraid" TEXT;

-- AlterTable
ALTER TABLE "FunnelSession" ADD COLUMN     "conversionPlatform" TEXT,
ADD COLUMN     "fbc" TEXT,
ADD COLUMN     "fbp" TEXT,
ADD COLUMN     "firstFbclid" TEXT,
ADD COLUMN     "firstGclid" TEXT,
ADD COLUMN     "firstLiFatId" TEXT,
ADD COLUMN     "firstMsclkid" TEXT,
ADD COLUMN     "firstTtclid" TEXT,
ADD COLUMN     "firstTwclid" TEXT,
ADD COLUMN     "lastFbclid" TEXT,
ADD COLUMN     "lastGclid" TEXT,
ADD COLUMN     "lastLiFatId" TEXT,
ADD COLUMN     "lastMsclkid" TEXT,
ADD COLUMN     "lastTtclid" TEXT,
ADD COLUMN     "lastTwclid" TEXT,
ADD COLUMN     "ttp" TEXT;

-- CreateIndex
CREATE INDEX "FunnelEvent_fbclid_idx" ON "FunnelEvent"("fbclid");

-- CreateIndex
CREATE INDEX "FunnelEvent_gclid_idx" ON "FunnelEvent"("gclid");

-- CreateIndex
CREATE INDEX "FunnelEvent_ttclid_idx" ON "FunnelEvent"("ttclid");

-- CreateIndex
CREATE INDEX "FunnelEvent_msclkid_idx" ON "FunnelEvent"("msclkid");
