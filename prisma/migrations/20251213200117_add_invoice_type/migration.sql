-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SENT', 'RECEIVED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "type" "InvoiceType" NOT NULL DEFAULT 'SENT';

-- CreateIndex
CREATE INDEX "Invoice_organizationId_type_idx" ON "Invoice"("organizationId", "type");

-- CreateIndex
CREATE INDEX "Invoice_type_idx" ON "Invoice"("type");
