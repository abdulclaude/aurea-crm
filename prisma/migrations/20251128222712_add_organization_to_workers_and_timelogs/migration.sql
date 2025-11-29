/*
  Warnings:

  - Added the required column `organizationId` to the `qr_code` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `time_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `worker` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "qr_code" DROP CONSTRAINT "qr_code_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "time_log" DROP CONSTRAINT "time_log_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "worker" DROP CONSTRAINT "worker_subaccountId_fkey";

-- DropIndex
DROP INDEX "time_log_subaccountId_contactId_idx";

-- DropIndex
DROP INDEX "time_log_subaccountId_dealId_idx";

-- DropIndex
DROP INDEX "time_log_subaccountId_startTime_idx";

-- DropIndex
DROP INDEX "time_log_subaccountId_status_idx";

-- DropIndex
DROP INDEX "time_log_subaccountId_workerId_idx";

-- AlterTable: Add organizationId column temporarily nullable
ALTER TABLE "qr_code" ADD COLUMN     "organizationId" TEXT;

-- AlterTable: Add organizationId column temporarily nullable
ALTER TABLE "time_log" ADD COLUMN     "organizationId" TEXT;

-- AlterTable: Add organizationId column temporarily nullable
ALTER TABLE "worker" ADD COLUMN     "organizationId" TEXT;

-- Populate organizationId from subaccount for QRCode
UPDATE "qr_code"
SET "organizationId" = s."organizationId"
FROM "subaccount" s
WHERE "qr_code"."subaccountId" = s."id";

-- Populate organizationId from subaccount for TimeLog
UPDATE "time_log"
SET "organizationId" = s."organizationId"
FROM "subaccount" s
WHERE "time_log"."subaccountId" = s."id";

-- Populate organizationId from subaccount for Worker
UPDATE "worker"
SET "organizationId" = s."organizationId"
FROM "subaccount" s
WHERE "worker"."subaccountId" = s."id";

-- Make organizationId NOT NULL for qr_code
ALTER TABLE "qr_code" ALTER COLUMN "organizationId" SET NOT NULL;

-- Make organizationId NOT NULL for time_log
ALTER TABLE "time_log" ALTER COLUMN "organizationId" SET NOT NULL;

-- Make organizationId NOT NULL for worker
ALTER TABLE "worker" ALTER COLUMN "organizationId" SET NOT NULL;

-- Make subaccountId nullable for qr_code
ALTER TABLE "qr_code" ALTER COLUMN "subaccountId" DROP NOT NULL;

-- Make subaccountId nullable for time_log
ALTER TABLE "time_log" ALTER COLUMN "subaccountId" DROP NOT NULL;

-- Make subaccountId nullable for worker
ALTER TABLE "worker" ALTER COLUMN "subaccountId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "qr_code_organizationId_idx" ON "qr_code"("organizationId");

-- CreateIndex
CREATE INDEX "qr_code_organizationId_subaccountId_idx" ON "qr_code"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "time_log_organizationId_idx" ON "time_log"("organizationId");

-- CreateIndex
CREATE INDEX "time_log_subaccountId_idx" ON "time_log"("subaccountId");

-- CreateIndex
CREATE INDEX "time_log_organizationId_subaccountId_idx" ON "time_log"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "time_log_organizationId_workerId_idx" ON "time_log"("organizationId", "workerId");

-- CreateIndex
CREATE INDEX "time_log_organizationId_contactId_idx" ON "time_log"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "time_log_organizationId_dealId_idx" ON "time_log"("organizationId", "dealId");

-- CreateIndex
CREATE INDEX "time_log_organizationId_status_idx" ON "time_log"("organizationId", "status");

-- CreateIndex
CREATE INDEX "time_log_organizationId_startTime_idx" ON "time_log"("organizationId", "startTime");

-- CreateIndex
CREATE INDEX "worker_organizationId_idx" ON "worker"("organizationId");

-- CreateIndex
CREATE INDEX "worker_organizationId_subaccountId_idx" ON "worker"("organizationId", "subaccountId");

-- AddForeignKey
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker" ADD CONSTRAINT "worker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker" ADD CONSTRAINT "worker_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
