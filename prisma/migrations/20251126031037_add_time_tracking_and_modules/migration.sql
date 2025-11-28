-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('TIME_TRACKING', 'INVOICING', 'INVENTORY', 'BOOKING_CALENDAR', 'DOCUMENT_SIGNING', 'PROJECT_MANAGEMENT');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('MANUAL', 'QR_CODE', 'GPS', 'BIOMETRIC', 'NFC');

-- CreateEnum
CREATE TYPE "TimeLogStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED');

-- CreateTable
CREATE TABLE "subaccount_module" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subaccount_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_log" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "dealId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "breakDuration" INTEGER,
    "checkInMethod" "CheckInMethod" NOT NULL DEFAULT 'MANUAL',
    "checkInLocation" JSONB,
    "checkOutLocation" JSONB,
    "qrCodeId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "status" "TimeLogStatus" NOT NULL DEFAULT 'DRAFT',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "hourlyRate" DECIMAL(10,2),
    "totalAmount" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "invoiceId" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_code" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dealId" TEXT,
    "location" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subaccount_module_subaccountId_enabled_idx" ON "subaccount_module"("subaccountId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "subaccount_module_subaccountId_moduleType_key" ON "subaccount_module"("subaccountId", "moduleType");

-- CreateIndex
CREATE INDEX "time_log_subaccountId_contactId_idx" ON "time_log"("subaccountId", "contactId");

-- CreateIndex
CREATE INDEX "time_log_subaccountId_dealId_idx" ON "time_log"("subaccountId", "dealId");

-- CreateIndex
CREATE INDEX "time_log_subaccountId_status_idx" ON "time_log"("subaccountId", "status");

-- CreateIndex
CREATE INDEX "time_log_subaccountId_startTime_idx" ON "time_log"("subaccountId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "qr_code_code_key" ON "qr_code"("code");

-- CreateIndex
CREATE INDEX "qr_code_subaccountId_idx" ON "qr_code"("subaccountId");

-- CreateIndex
CREATE INDEX "qr_code_code_idx" ON "qr_code"("code");

-- AddForeignKey
ALTER TABLE "subaccount_module" ADD CONSTRAINT "subaccount_module_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
