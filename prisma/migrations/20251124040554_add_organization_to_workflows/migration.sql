-- AlterTable
ALTER TABLE "Workflows" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "Workflows_organizationId_idx" ON "Workflows"("organizationId");

-- AddForeignKey
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
