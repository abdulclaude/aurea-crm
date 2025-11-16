-- Add WhatsApp node types
ALTER TYPE "NodeType" ADD VALUE 'WHATSAPP_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'WHATSAPP_EXECUTION';

-- Add WhatsApp integration provider
ALTER TYPE "IntegrationProvider" ADD VALUE 'WHATSAPP';

-- Table to store WhatsApp trigger state
CREATE TABLE "WhatsAppTriggerState" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "lastMessageId" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppTriggerState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppTriggerState_nodeId_key"
  ON "WhatsAppTriggerState"("nodeId");

CREATE INDEX "WhatsAppTriggerState_workflowId_idx"
  ON "WhatsAppTriggerState"("workflowId");

ALTER TABLE "WhatsAppTriggerState"
ADD CONSTRAINT "WhatsAppTriggerState_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppTriggerState"
ADD CONSTRAINT "WhatsAppTriggerState_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

