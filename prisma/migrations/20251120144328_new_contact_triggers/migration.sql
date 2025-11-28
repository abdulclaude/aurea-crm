/*
  Warnings:

  - The values [WHATSAPP] on the enum `IntegrationProvider` will be removed. If these variants are still used in the database, this will fail.
  - The values [WHATSAPP_TRIGGER,WHATSAPP_EXECUTION] on the enum `NodeType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `WhatsAppTriggerState` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IntegrationProvider_new" AS ENUM ('GOOGLE_CALENDAR', 'GMAIL', 'GOOGLE', 'TELEGRAM');
ALTER TABLE "Integration" ALTER COLUMN "provider" TYPE "IntegrationProvider_new" USING ("provider"::text::"IntegrationProvider_new");
ALTER TYPE "IntegrationProvider" RENAME TO "IntegrationProvider_old";
ALTER TYPE "IntegrationProvider_new" RENAME TO "IntegrationProvider";
DROP TYPE "public"."IntegrationProvider_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NodeType_new" AS ENUM ('INITIAL', 'MANUAL_TRIGGER', 'GOOGLE_FORM_TRIGGER', 'GOOGLE_CALENDAR_TRIGGER', 'GOOGLE_CALENDAR_EXECUTION', 'GMAIL_TRIGGER', 'GMAIL_EXECUTION', 'TELEGRAM_TRIGGER', 'TELEGRAM_EXECUTION', 'STRIPE_TRIGGER', 'HTTP_REQUEST', 'GEMINI', 'ANTHROPIC', 'OPENAI', 'DISCORD', 'SLACK', 'WAIT', 'CREATE_CONTACT', 'UPDATE_CONTACT', 'DELETE_CONTACT', 'CREATE_DEAL', 'UPDATE_DEAL', 'DELETE_DEAL', 'UPDATE_PIPELINE', 'CONTACT_CREATED_TRIGGER', 'CONTACT_UPDATED_TRIGGER', 'CONTACT_FIELD_CHANGED_TRIGGER', 'CONTACT_DELETED_TRIGGER', 'CONTACT_TYPE_CHANGED_TRIGGER', 'CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER');
ALTER TABLE "Node" ALTER COLUMN "type" TYPE "NodeType_new" USING ("type"::text::"NodeType_new");
ALTER TYPE "NodeType" RENAME TO "NodeType_old";
ALTER TYPE "NodeType_new" RENAME TO "NodeType";
DROP TYPE "public"."NodeType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "WhatsAppTriggerState" DROP CONSTRAINT "WhatsAppTriggerState_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppTriggerState" DROP CONSTRAINT "WhatsAppTriggerState_workflowId_fkey";

-- DropTable
DROP TABLE "WhatsAppTriggerState";
