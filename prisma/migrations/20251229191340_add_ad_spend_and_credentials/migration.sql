-- CreateTable
CREATE TABLE "AdSpend" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "funnelId" TEXT,
    "platform" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignName" TEXT,
    "adSetId" TEXT,
    "adSetName" TEXT,
    "adId" TEXT,
    "adName" TEXT,
    "date" DATE NOT NULL,
    "spend" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "revenue" DECIMAL(10,2),
    "cpc" DECIMAL(10,2),
    "cpm" DECIMAL(10,2),
    "ctr" DECIMAL(5,2),
    "conversionRate" DECIMAL(5,2),
    "roas" DECIMAL(10,2),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPlatformCredential" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "platform" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "accountId" TEXT,
    "pixelId" TEXT,
    "developerId" TEXT,
    "customerId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdSpend_organizationId_date_idx" ON "AdSpend"("organizationId", "date");

-- CreateIndex
CREATE INDEX "AdSpend_funnelId_date_idx" ON "AdSpend"("funnelId", "date");

-- CreateIndex
CREATE INDEX "AdSpend_platform_date_idx" ON "AdSpend"("platform", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpend_organizationId_platform_campaignId_date_key" ON "AdSpend"("organizationId", "platform", "campaignId", "date");

-- CreateIndex
CREATE INDEX "AdPlatformCredential_organizationId_platform_idx" ON "AdPlatformCredential"("organizationId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlatformCredential_organizationId_platform_accountId_key" ON "AdPlatformCredential"("organizationId", "platform", "accountId");

-- AddForeignKey
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlatformCredential" ADD CONSTRAINT "AdPlatformCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlatformCredential" ADD CONSTRAINT "AdPlatformCredential_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
