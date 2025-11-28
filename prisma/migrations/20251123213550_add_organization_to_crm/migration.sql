/*
  Warnings:

  - Added the required column `organizationId` to the `contact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `pipeline` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "deal" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "pipeline" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "contact_organizationId_subaccountId_idx" ON "contact"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "deal_organizationId_subaccountId_idx" ON "deal"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "pipeline_organizationId_subaccountId_idx" ON "pipeline"("organizationId", "subaccountId");

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline" ADD CONSTRAINT "pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
