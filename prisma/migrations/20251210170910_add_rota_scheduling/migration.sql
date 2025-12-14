-- CreateEnum
CREATE TYPE "RotaStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "rota" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "workerId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyName" TEXT,
    "dealId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "status" "RotaStatus" NOT NULL DEFAULT 'SCHEDULED',
    "hourlyRate" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'GBP',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "customFields" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rota_organizationId_idx" ON "rota"("organizationId");

-- CreateIndex
CREATE INDEX "rota_subaccountId_idx" ON "rota"("subaccountId");

-- CreateIndex
CREATE INDEX "rota_workerId_idx" ON "rota"("workerId");

-- CreateIndex
CREATE INDEX "rota_contactId_idx" ON "rota"("contactId");

-- CreateIndex
CREATE INDEX "rota_startTime_idx" ON "rota"("startTime");

-- CreateIndex
CREATE INDEX "rota_status_idx" ON "rota"("status");

-- AddForeignKey
ALTER TABLE "rota" ADD CONSTRAINT "rota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota" ADD CONSTRAINT "rota_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota" ADD CONSTRAINT "rota_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota" ADD CONSTRAINT "rota_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota" ADD CONSTRAINT "rota_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
