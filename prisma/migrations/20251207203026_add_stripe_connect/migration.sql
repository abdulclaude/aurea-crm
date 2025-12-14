-- CreateTable
CREATE TABLE "stripe_connection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "stripeAccountId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "businessName" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "applicationFeePercent" DECIMAL(5,2),
    "applicationFeeFixed" DECIMAL(10,2),
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_connection_stripeAccountId_key" ON "stripe_connection"("stripeAccountId");

-- CreateIndex
CREATE INDEX "stripe_connection_organizationId_idx" ON "stripe_connection"("organizationId");

-- CreateIndex
CREATE INDEX "stripe_connection_subaccountId_idx" ON "stripe_connection"("subaccountId");

-- CreateIndex
CREATE INDEX "stripe_connection_stripeAccountId_idx" ON "stripe_connection"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_connection_subaccountId_key" ON "stripe_connection"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_connection_organizationId_subaccountId_key" ON "stripe_connection"("organizationId", "subaccountId");

-- AddForeignKey
ALTER TABLE "stripe_connection" ADD CONSTRAINT "stripe_connection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_connection" ADD CONSTRAINT "stripe_connection_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
