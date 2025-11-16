-- Add Telegram credential type
ALTER TYPE "CredentialType" ADD VALUE 'TELEGRAM_BOT';

-- Add Telegram node types
ALTER TYPE "NodeType" ADD VALUE 'TELEGRAM_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'TELEGRAM_EXECUTION';

-- Extend credentials with metadata
ALTER TABLE "Credential"
ADD COLUMN "metadata" JSONB DEFAULT '{}'::jsonb;

-- Table to store Telegram trigger state
CREATE TABLE "TelegramTriggerState" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "lastUpdateId" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramTriggerState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramTriggerState_nodeId_key"
  ON "TelegramTriggerState"("nodeId");

CREATE INDEX "TelegramTriggerState_workflowId_idx"
  ON "TelegramTriggerState"("workflowId");

ALTER TABLE "TelegramTriggerState"
ADD CONSTRAINT "TelegramTriggerState_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramTriggerState"
ADD CONSTRAINT "TelegramTriggerState_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

