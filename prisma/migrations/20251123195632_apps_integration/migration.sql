/*
  Warnings:

  - You are about to drop the `Integration` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AppProvider" AS ENUM ('GOOGLE_CALENDAR', 'GMAIL', 'GOOGLE', 'TELEGRAM');

-- DropForeignKey
ALTER TABLE "Integration" DROP CONSTRAINT "Integration_userId_fkey";

-- DropTable
DROP TABLE "Integration";

-- DropEnum
DROP TYPE "AppIntegrationProvider";

-- CreateTable
CREATE TABLE "Apps" (
    "id" TEXT NOT NULL,
    "provider" "AppProvider" NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Apps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Apps_userId_provider_key" ON "Apps"("userId", "provider");

-- AddForeignKey
ALTER TABLE "Apps" ADD CONSTRAINT "Apps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
