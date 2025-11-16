-- Create Gmail subscription/watch tables

CREATE TABLE "GmailSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "labelIds" TEXT[],
    "topicName" TEXT NOT NULL,
    "historyId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GmailSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GmailTriggerState" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "lastMessageId" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GmailTriggerState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GmailSubscription_userId_key" ON "GmailSubscription"("userId");
CREATE INDEX "GmailSubscription_emailAddress_idx" ON "GmailSubscription"("emailAddress");
CREATE UNIQUE INDEX "GmailTriggerState_nodeId_key" ON "GmailTriggerState"("nodeId");
CREATE INDEX "GmailTriggerState_workflowId_idx" ON "GmailTriggerState"("workflowId");

ALTER TABLE "GmailSubscription"
ADD CONSTRAINT "GmailSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GmailTriggerState"
ADD CONSTRAINT "GmailTriggerState_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GmailTriggerState"
ADD CONSTRAINT "GmailTriggerState_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
