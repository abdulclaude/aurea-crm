-- CreateEnum
CREATE TYPE "BankTransferStatus" AS ENUM ('PENDING', 'PROOF_UPLOADED', 'VERIFIED', 'REJECTED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "bankTransferNotes" TEXT,
ADD COLUMN     "bankTransferProof" TEXT,
ADD COLUMN     "bankTransferStatus" "BankTransferStatus",
ADD COLUMN     "bankTransferVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "bankTransferVerifiedBy" TEXT,
ADD COLUMN     "paymentMethods" "PaymentMethod"[] DEFAULT ARRAY[]::"PaymentMethod"[];

-- CreateTable
CREATE TABLE "bank_transfer_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "routingNumber" TEXT,
    "iban" TEXT,
    "swiftBic" TEXT,
    "bankAddress" JSONB,
    "accountType" TEXT,
    "currency" TEXT DEFAULT 'USD',
    "instructions" TEXT,
    "referenceFormat" TEXT,
    "autoReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderDays" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transfer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_transfer_settings_organizationId_idx" ON "bank_transfer_settings"("organizationId");

-- CreateIndex
CREATE INDEX "bank_transfer_settings_subaccountId_idx" ON "bank_transfer_settings"("subaccountId");

-- CreateIndex
CREATE INDEX "bank_transfer_settings_enabled_idx" ON "bank_transfer_settings"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfer_settings_subaccountId_key" ON "bank_transfer_settings"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfer_settings_organizationId_subaccountId_key" ON "bank_transfer_settings"("organizationId", "subaccountId");

-- AddForeignKey
ALTER TABLE "bank_transfer_settings" ADD CONSTRAINT "bank_transfer_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfer_settings" ADD CONSTRAINT "bank_transfer_settings_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
