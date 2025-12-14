-- CreateEnum
CREATE TYPE "RecurringInvoiceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'ANNUALLY');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "businessAddress" JSONB,
ADD COLUMN     "businessEmail" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "recurring_invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "RecurringInvoiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "contactId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactAddress" JSONB,
    "billingModel" "BillingModel" NOT NULL DEFAULT 'RETAINER',
    "templateId" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "lineItems" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dueDays" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "termsConditions" TEXT,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "sendReminders" BOOLEAN NOT NULL DEFAULT false,
    "lastRunDate" TIMESTAMP(3),
    "invoicesGenerated" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoice_generation" (
    "id" TEXT NOT NULL,
    "recurringInvoiceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoice_generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_invoice_organizationId_idx" ON "recurring_invoice"("organizationId");

-- CreateIndex
CREATE INDEX "recurring_invoice_subaccountId_idx" ON "recurring_invoice"("subaccountId");

-- CreateIndex
CREATE INDEX "recurring_invoice_status_idx" ON "recurring_invoice"("status");

-- CreateIndex
CREATE INDEX "recurring_invoice_nextRunDate_idx" ON "recurring_invoice"("nextRunDate");

-- CreateIndex
CREATE INDEX "recurring_invoice_frequency_idx" ON "recurring_invoice"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_invoice_generation_invoiceId_key" ON "recurring_invoice_generation"("invoiceId");

-- CreateIndex
CREATE INDEX "recurring_invoice_generation_recurringInvoiceId_idx" ON "recurring_invoice_generation"("recurringInvoiceId");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice" ADD CONSTRAINT "recurring_invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoice_generation" ADD CONSTRAINT "recurring_invoice_generation_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "recurring_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
