-- CreateEnum
CREATE TYPE "FunnelDomainType" AS ENUM ('SUBDOMAIN', 'CUSTOM');

-- AlterTable
ALTER TABLE "funnel" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "domainType" "FunnelDomainType" NOT NULL DEFAULT 'SUBDOMAIN',
ADD COLUMN     "domainVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subdomain" TEXT;

-- CreateIndex
CREATE INDEX "funnel_subdomain_idx" ON "funnel"("subdomain");

-- CreateIndex
CREATE INDEX "funnel_customDomain_idx" ON "funnel"("customDomain");
