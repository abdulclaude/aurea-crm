-- DropIndex
DROP INDEX "subaccount_organizationId_key";

-- AlterTable
ALTER TABLE "subaccount" ADD COLUMN     "industry" TEXT;

-- CreateIndex
CREATE INDEX "subaccount_organizationId_idx" ON "subaccount"("organizationId");
