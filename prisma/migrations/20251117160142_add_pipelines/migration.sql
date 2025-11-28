/*
  Warnings:

  - You are about to drop the column `pipeline` on the `deal` table. All the data in the column will be lost.
  - You are about to drop the column `probability` on the `deal` table. All the data in the column will be lost.
  - You are about to drop the column `stage` on the `deal` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "deal_subaccountId_stage_idx";

-- AlterTable
ALTER TABLE "deal" DROP COLUMN "pipeline",
DROP COLUMN "probability",
DROP COLUMN "stage",
ADD COLUMN     "pipelineId" TEXT,
ADD COLUMN     "pipelineStageId" TEXT;

-- DropEnum
DROP TYPE "DealStage";

-- CreateTable
CREATE TABLE "pipeline" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "rottingDays" INTEGER,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_subaccountId_isActive_idx" ON "pipeline"("subaccountId", "isActive");

-- CreateIndex
CREATE INDEX "pipeline_stage_pipelineId_idx" ON "pipeline_stage"("pipelineId");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stage_pipelineId_position_key" ON "pipeline_stage"("pipelineId", "position");

-- CreateIndex
CREATE INDEX "deal_subaccountId_pipelineStageId_idx" ON "deal"("subaccountId", "pipelineStageId");

-- CreateIndex
CREATE INDEX "deal_pipelineId_idx" ON "deal"("pipelineId");

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline" ADD CONSTRAINT "pipeline_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stage" ADD CONSTRAINT "pipeline_stage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
