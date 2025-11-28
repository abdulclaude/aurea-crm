/*
  Warnings:

  - Changed the type of `provider` on the `Integration` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AppIntegrationProvider" AS ENUM ('GOOGLE_CALENDAR', 'GMAIL', 'GOOGLE', 'TELEGRAM');

-- AlterTable
ALTER TABLE "Integration" DROP COLUMN "provider",
ADD COLUMN     "provider" "AppIntegrationProvider" NOT NULL;

-- DropEnum
DROP TYPE "IntegrationProvider";

-- CreateIndex
CREATE UNIQUE INDEX "Integration_userId_provider_key" ON "Integration"("userId", "provider");
