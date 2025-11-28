-- AlterTable
ALTER TABLE "time_log" ADD COLUMN     "workerId" TEXT;

-- CreateTable
CREATE TABLE "worker" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "employeeId" TEXT,
    "portalToken" TEXT,
    "portalTokenExpiry" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "hourlyRate" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_portalToken_key" ON "worker"("portalToken");

-- CreateIndex
CREATE INDEX "worker_subaccountId_idx" ON "worker"("subaccountId");

-- CreateIndex
CREATE INDEX "worker_email_idx" ON "worker"("email");

-- CreateIndex
CREATE INDEX "worker_phone_idx" ON "worker"("phone");

-- CreateIndex
CREATE INDEX "worker_portalToken_idx" ON "worker"("portalToken");

-- CreateIndex
CREATE INDEX "time_log_subaccountId_workerId_idx" ON "time_log"("subaccountId", "workerId");

-- AddForeignKey
ALTER TABLE "time_log" ADD CONSTRAINT "time_log_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker" ADD CONSTRAINT "worker_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
