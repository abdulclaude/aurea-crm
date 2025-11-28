-- CreateEnum
CREATE TYPE "AILogStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AILog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "intent" TEXT,
    "userMessage" TEXT NOT NULL,
    "status" "AILogStatus" NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "subaccountId" TEXT,

    CONSTRAINT "AILog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AILog_userId_idx" ON "AILog"("userId");

-- CreateIndex
CREATE INDEX "AILog_organizationId_idx" ON "AILog"("organizationId");

-- CreateIndex
CREATE INDEX "AILog_subaccountId_idx" ON "AILog"("subaccountId");

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
