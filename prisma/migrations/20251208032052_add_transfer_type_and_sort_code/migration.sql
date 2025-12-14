-- AlterTable
ALTER TABLE "bank_transfer_settings" ADD COLUMN     "sortCode" TEXT,
ADD COLUMN     "transferType" TEXT DEFAULT 'UK_DOMESTIC';
