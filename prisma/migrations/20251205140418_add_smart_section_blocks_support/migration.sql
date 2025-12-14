-- AlterTable
ALTER TABLE "funnel_block" ADD COLUMN     "smartSectionId" TEXT,
ALTER COLUMN "pageId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "smart_section" ALTER COLUMN "blockStructure" SET DEFAULT '[]';

-- CreateIndex
CREATE INDEX "funnel_block_smartSectionId_idx" ON "funnel_block"("smartSectionId");

-- CreateIndex
CREATE INDEX "funnel_block_smartSectionId_order_idx" ON "funnel_block"("smartSectionId", "order");

-- AddForeignKey
ALTER TABLE "funnel_block" ADD CONSTRAINT "funnel_block_smartSectionId_fkey" FOREIGN KEY ("smartSectionId") REFERENCES "smart_section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
