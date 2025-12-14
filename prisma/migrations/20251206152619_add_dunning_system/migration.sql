-- AlterTable
ALTER TABLE "invoice_reminder" ADD COLUMN     "daysOverdue" INTEGER,
ADD COLUMN     "isDunning" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "dunningDays" JSONB,
ADD COLUMN     "dunningEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "subaccount" ADD COLUMN     "dunningDays" JSONB,
ADD COLUMN     "dunningEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "invoice_reminder_isDunning_idx" ON "invoice_reminder"("isDunning");
