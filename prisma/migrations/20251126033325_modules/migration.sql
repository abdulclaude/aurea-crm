/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,moduleType]` on the table `subaccount_module` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "subaccount_module" ADD COLUMN     "organizationId" TEXT,
ALTER COLUMN "subaccountId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "subaccount_module_organizationId_enabled_idx" ON "subaccount_module"("organizationId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "subaccount_module_organizationId_moduleType_key" ON "subaccount_module"("organizationId", "moduleType");

-- AddForeignKey
ALTER TABLE "subaccount_module" ADD CONSTRAINT "subaccount_module_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
