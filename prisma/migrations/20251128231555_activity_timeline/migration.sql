-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CONTACT', 'DEAL', 'WORKFLOW', 'EXECUTION', 'PIPELINE', 'TASK', 'EMAIL', 'CALL', 'MEETING', 'NOTE', 'WORKER', 'TIME_LOG', 'INVOICE', 'CREDENTIAL', 'WEBHOOK', 'INTEGRATION', 'SUBACCOUNT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ASSIGNED', 'UNASSIGNED', 'STAGE_CHANGED', 'STATUS_CHANGED', 'COMPLETED', 'ARCHIVED', 'RESTORED');

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_organizationId_idx" ON "activity"("organizationId");

-- CreateIndex
CREATE INDEX "activity_subaccountId_idx" ON "activity"("subaccountId");

-- CreateIndex
CREATE INDEX "activity_userId_idx" ON "activity"("userId");

-- CreateIndex
CREATE INDEX "activity_entityType_entityId_idx" ON "activity"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_type_idx" ON "activity"("type");

-- CreateIndex
CREATE INDEX "activity_createdAt_idx" ON "activity"("createdAt");

-- CreateIndex
CREATE INDEX "activity_organizationId_subaccountId_idx" ON "activity"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "activity_organizationId_entityType_entityId_idx" ON "activity"("organizationId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
