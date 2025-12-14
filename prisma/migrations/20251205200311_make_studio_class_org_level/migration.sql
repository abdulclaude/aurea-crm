/*
  Warnings:

  - Added the required column `organizationId` to the `studio_class` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "studio_class" ADD COLUMN     "organizationId" TEXT NOT NULL,
ALTER COLUMN "subaccountId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "studio_class_organizationId_idx" ON "studio_class"("organizationId");

-- AddForeignKey
ALTER TABLE "studio_class" ADD CONSTRAINT "studio_class_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
