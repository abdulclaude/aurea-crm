-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppProvider" ADD VALUE 'MICROSOFT';
ALTER TYPE "AppProvider" ADD VALUE 'OUTLOOK';
ALTER TYPE "AppProvider" ADD VALUE 'ONEDRIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'OUTLOOK_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'OUTLOOK_EXECUTION';
ALTER TYPE "NodeType" ADD VALUE 'ONEDRIVE_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'ONEDRIVE_EXECUTION';

-- CreateTable
CREATE TABLE "OutlookSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutlookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutlookTriggerState" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "lastMessageId" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutlookTriggerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneDriveSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneDriveSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneDriveTriggerState" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "lastDeltaLink" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneDriveTriggerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutlookSubscription_userId_key" ON "OutlookSubscription"("userId");

-- CreateIndex
CREATE INDEX "OutlookSubscription_emailAddress_idx" ON "OutlookSubscription"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "OutlookTriggerState_nodeId_key" ON "OutlookTriggerState"("nodeId");

-- CreateIndex
CREATE INDEX "OutlookTriggerState_workflowId_idx" ON "OutlookTriggerState"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "OneDriveSubscription_userId_key" ON "OneDriveSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OneDriveTriggerState_nodeId_key" ON "OneDriveTriggerState"("nodeId");

-- CreateIndex
CREATE INDEX "OneDriveTriggerState_workflowId_idx" ON "OneDriveTriggerState"("workflowId");

-- AddForeignKey
ALTER TABLE "OutlookSubscription" ADD CONSTRAINT "OutlookSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutlookTriggerState" ADD CONSTRAINT "OutlookTriggerState_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutlookTriggerState" ADD CONSTRAINT "OutlookTriggerState_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneDriveSubscription" ADD CONSTRAINT "OneDriveSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneDriveTriggerState" ADD CONSTRAINT "OneDriveTriggerState_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneDriveTriggerState" ADD CONSTRAINT "OneDriveTriggerState_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
