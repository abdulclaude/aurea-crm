/*
  Warnings:

  - You are about to drop the column `rootBlockId` on the `smart_section_instance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[smartSectionInstanceId]` on the table `funnel_block` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "smart_section_instance_rootBlockId_key";

-- AlterTable
ALTER TABLE "funnel_block" ADD COLUMN     "smartSectionInstanceId" TEXT;

-- AlterTable
ALTER TABLE "smart_section_instance" DROP COLUMN "rootBlockId",
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "funnel_block_smartSectionInstanceId_key" ON "funnel_block"("smartSectionInstanceId");

-- CreateIndex
CREATE INDEX "funnel_block_smartSectionInstanceId_idx" ON "funnel_block"("smartSectionInstanceId");

-- AddForeignKey
ALTER TABLE "funnel_block" ADD CONSTRAINT "funnel_block_smartSectionInstanceId_fkey" FOREIGN KEY ("smartSectionInstanceId") REFERENCES "smart_section_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
