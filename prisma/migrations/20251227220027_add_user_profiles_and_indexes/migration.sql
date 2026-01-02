-- AlterTable
ALTER TABLE "FunnelSession" ADD COLUMN     "profileId" TEXT;

-- CreateTable
CREATE TABLE "anonymous_user_profiles" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "anonymous_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunnelSession_anonymousId_idx" ON "FunnelSession"("anonymousId");

-- CreateIndex
CREATE INDEX "FunnelSession_profileId_idx" ON "FunnelSession"("profileId");

-- AddForeignKey
ALTER TABLE "FunnelSession" ADD CONSTRAINT "FunnelSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "anonymous_user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
