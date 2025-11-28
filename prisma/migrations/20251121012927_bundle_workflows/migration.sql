-- AlterEnum
ALTER TYPE "NodeType" ADD VALUE 'BUNDLE_WORKFLOW';

-- AlterTable
ALTER TABLE "Workflows" ADD COLUMN     "bundleInputs" JSONB,
ADD COLUMN     "bundleOutputs" JSONB,
ADD COLUMN     "isBundle" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Workflows_isBundle_idx" ON "Workflows"("isBundle");
