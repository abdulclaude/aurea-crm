-- AlterTable
ALTER TABLE "Workflows" ADD COLUMN "subaccountId" TEXT;
ALTER TABLE "Credential" ADD COLUMN "subaccountId" TEXT;
ALTER TABLE "Webhook" ADD COLUMN "subaccountId" TEXT;
ALTER TABLE "Execution" ADD COLUMN "subaccountId" TEXT;

-- CreateIndex
CREATE INDEX "Workflows_subaccountId_idx" ON "Workflows"("subaccountId");
CREATE INDEX "Credential_subaccountId_idx" ON "Credential"("subaccountId");
CREATE INDEX "Webhook_subaccountId_idx" ON "Webhook"("subaccountId");
CREATE INDEX "Execution_subaccountId_idx" ON "Execution"("subaccountId");

-- AddForeignKey
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
