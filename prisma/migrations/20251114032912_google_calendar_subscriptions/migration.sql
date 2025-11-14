-- CreateTable
CREATE TABLE "GoogleCalendarSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarName" TEXT,
    "listenFor" TEXT[],
    "channelId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "syncToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoogleCalendarSubscription_workflowId_idx" ON "GoogleCalendarSubscription"("workflowId");

-- CreateIndex
CREATE INDEX "GoogleCalendarSubscription_channelId_idx" ON "GoogleCalendarSubscription"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarSubscription_nodeId_key" ON "GoogleCalendarSubscription"("nodeId");

-- AddForeignKey
ALTER TABLE "GoogleCalendarSubscription" ADD CONSTRAINT "GoogleCalendarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarSubscription" ADD CONSTRAINT "GoogleCalendarSubscription_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarSubscription" ADD CONSTRAINT "GoogleCalendarSubscription_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
