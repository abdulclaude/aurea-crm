-- DropForeignKey
ALTER TABLE "contact" DROP CONSTRAINT "contact_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "deal" DROP CONSTRAINT "deal_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "pipeline" DROP CONSTRAINT "pipeline_subaccountId_fkey";

-- AlterTable
ALTER TABLE "contact" ALTER COLUMN "subaccountId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "deal" ALTER COLUMN "subaccountId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pipeline" ALTER COLUMN "subaccountId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline" ADD CONSTRAINT "pipeline_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
