/*
  Warnings:

  - You are about to drop the `account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bank_transfer_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `billing_rule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact_assignee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deal_contact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deal_member` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form_field` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form_step` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form_submission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel_block` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel_block_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel_block_event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel_breakpoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel_page` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `funnel_pixel_integration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `global_style_preset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoice_line_item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoice_payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoice_reminder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoice_template` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `member` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification_preference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_integration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pipeline` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pipeline_stage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `qr_code` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recurring_invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recurring_invoice_generation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rota` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `smart_section` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `smart_section_instance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stripe_connection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_class` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_membership` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subaccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subaccount_member` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subaccount_module` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `time_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_presence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `worker` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `worker_document` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AILog" DROP CONSTRAINT "AILog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "AILog" DROP CONSTRAINT "AILog_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "AILog" DROP CONSTRAINT "AILog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Apps" DROP CONSTRAINT "Apps_userId_fkey";

-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_userId_fkey";

-- DropForeignKey
ALTER TABLE "Execution" DROP CONSTRAINT "Execution_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "GmailSubscription" DROP CONSTRAINT "GmailSubscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "GoogleCalendarSubscription" DROP CONSTRAINT "GoogleCalendarSubscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "OneDriveSubscription" DROP CONSTRAINT "OneDriveSubscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "OutlookSubscription" DROP CONSTRAINT "OutlookSubscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_userId_fkey";

-- DropForeignKey
ALTER TABLE "Workflows" DROP CONSTRAINT "Workflows_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Workflows" DROP CONSTRAINT "Workflows_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "Workflows" DROP CONSTRAINT "Workflows_userId_fkey";

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_userId_fkey";

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_userId_fkey";

-- DropForeignKey
ALTER TABLE "bank_transfer_settings" DROP CONSTRAINT "bank_transfer_settings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "bank_transfer_settings" DROP CONSTRAINT "bank_transfer_settings_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "contact" DROP CONSTRAINT "contact_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "contact" DROP CONSTRAINT "contact_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "contact_assignee" DROP CONSTRAINT "contact_assignee_contactId_fkey";

-- DropForeignKey
ALTER TABLE "contact_assignee" DROP CONSTRAINT "contact_assignee_subaccountMemberId_fkey";

-- DropForeignKey
ALTER TABLE "deal" DROP CONSTRAINT "deal_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "deal" DROP CONSTRAINT "deal_pipelineId_fkey";

-- DropForeignKey
ALTER TABLE "deal" DROP CONSTRAINT "deal_pipelineStageId_fkey";

-- DropForeignKey
ALTER TABLE "deal" DROP CONSTRAINT "deal_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "deal_contact" DROP CONSTRAINT "deal_contact_contactId_fkey";

-- DropForeignKey
ALTER TABLE "deal_contact" DROP CONSTRAINT "deal_contact_dealId_fkey";

-- DropForeignKey
ALTER TABLE "deal_member" DROP CONSTRAINT "deal_member_dealId_fkey";

-- DropForeignKey
ALTER TABLE "deal_member" DROP CONSTRAINT "deal_member_subaccountMemberId_fkey";

-- DropForeignKey
ALTER TABLE "form" DROP CONSTRAINT "form_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "form" DROP CONSTRAINT "form_stylePresetId_fkey";

-- DropForeignKey
ALTER TABLE "form" DROP CONSTRAINT "form_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "form" DROP CONSTRAINT "form_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "form_field" DROP CONSTRAINT "form_field_stepId_fkey";

-- DropForeignKey
ALTER TABLE "form_step" DROP CONSTRAINT "form_step_formId_fkey";

-- DropForeignKey
ALTER TABLE "form_submission" DROP CONSTRAINT "form_submission_contactId_fkey";

-- DropForeignKey
ALTER TABLE "form_submission" DROP CONSTRAINT "form_submission_formId_fkey";

-- DropForeignKey
ALTER TABLE "funnel" DROP CONSTRAINT "funnel_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "funnel" DROP CONSTRAINT "funnel_stylePresetId_fkey";

-- DropForeignKey
ALTER TABLE "funnel" DROP CONSTRAINT "funnel_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_analytics" DROP CONSTRAINT "funnel_analytics_funnelId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_analytics" DROP CONSTRAINT "funnel_analytics_pageId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_block" DROP CONSTRAINT "funnel_block_pageId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_block" DROP CONSTRAINT "funnel_block_parentBlockId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_block" DROP CONSTRAINT "funnel_block_smartSectionId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_block" DROP CONSTRAINT "funnel_block_smartSectionInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_block_analytics" DROP CONSTRAINT "funnel_block_analytics_blockId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_block_event" DROP CONSTRAINT "funnel_block_event_blockId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_breakpoint" DROP CONSTRAINT "funnel_breakpoint_blockId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_page" DROP CONSTRAINT "funnel_page_funnelId_fkey";

-- DropForeignKey
ALTER TABLE "funnel_pixel_integration" DROP CONSTRAINT "funnel_pixel_integration_funnelId_fkey";

-- DropForeignKey
ALTER TABLE "global_style_preset" DROP CONSTRAINT "global_style_preset_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "global_style_preset" DROP CONSTRAINT "global_style_preset_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_templateId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_line_item" DROP CONSTRAINT "invoice_line_item_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_payment" DROP CONSTRAINT "invoice_payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_reminder" DROP CONSTRAINT "invoice_reminder_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_userId_fkey";

-- DropForeignKey
ALTER TABLE "notification" DROP CONSTRAINT "notification_actorId_fkey";

-- DropForeignKey
ALTER TABLE "notification" DROP CONSTRAINT "notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "notification_preference" DROP CONSTRAINT "notification_preference_userId_fkey";

-- DropForeignKey
ALTER TABLE "pipeline" DROP CONSTRAINT "pipeline_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "pipeline" DROP CONSTRAINT "pipeline_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "pipeline_stage" DROP CONSTRAINT "pipeline_stage_pipelineId_fkey";

-- DropForeignKey
ALTER TABLE "qr_code" DROP CONSTRAINT "qr_code_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "qr_code" DROP CONSTRAINT "qr_code_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_invoice" DROP CONSTRAINT "recurring_invoice_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_invoice_generation" DROP CONSTRAINT "recurring_invoice_generation_recurringInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "rota" DROP CONSTRAINT "rota_contactId_fkey";

-- DropForeignKey
ALTER TABLE "rota" DROP CONSTRAINT "rota_dealId_fkey";

-- DropForeignKey
ALTER TABLE "rota" DROP CONSTRAINT "rota_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "rota" DROP CONSTRAINT "rota_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "rota" DROP CONSTRAINT "rota_workerId_fkey";

-- DropForeignKey
ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";

-- DropForeignKey
ALTER TABLE "smart_section" DROP CONSTRAINT "smart_section_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "smart_section" DROP CONSTRAINT "smart_section_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "smart_section_instance" DROP CONSTRAINT "smart_section_instance_formId_fkey";

-- DropForeignKey
ALTER TABLE "smart_section_instance" DROP CONSTRAINT "smart_section_instance_funnelPageId_fkey";

-- DropForeignKey
ALTER TABLE "smart_section_instance" DROP CONSTRAINT "smart_section_instance_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "stripe_connection" DROP CONSTRAINT "stripe_connection_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "stripe_connection" DROP CONSTRAINT "stripe_connection_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "studio_booking" DROP CONSTRAINT "studio_booking_classId_fkey";

-- DropForeignKey
ALTER TABLE "studio_booking" DROP CONSTRAINT "studio_booking_contactId_fkey";

-- DropForeignKey
ALTER TABLE "studio_class" DROP CONSTRAINT "studio_class_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "studio_class" DROP CONSTRAINT "studio_class_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "studio_membership" DROP CONSTRAINT "studio_membership_contactId_fkey";

-- DropForeignKey
ALTER TABLE "subaccount" DROP CONSTRAINT "subaccount_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "subaccount" DROP CONSTRAINT "subaccount_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "subaccount_member" DROP CONSTRAINT "subaccount_member_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "subaccount_member" DROP CONSTRAINT "subaccount_member_userId_fkey";

-- DropForeignKey
ALTER TABLE "subaccount_module" DROP CONSTRAINT "subaccount_module_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "subaccount_module" DROP CONSTRAINT "subaccount_module_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "time_log" DROP CONSTRAINT "time_log_contactId_fkey";

-- DropForeignKey
ALTER TABLE "time_log" DROP CONSTRAINT "time_log_dealId_fkey";

-- DropForeignKey
ALTER TABLE "time_log" DROP CONSTRAINT "time_log_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "time_log" DROP CONSTRAINT "time_log_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "time_log" DROP CONSTRAINT "time_log_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "time_log" DROP CONSTRAINT "time_log_workerId_fkey";

-- DropForeignKey
ALTER TABLE "user_presence" DROP CONSTRAINT "user_presence_userId_fkey";

-- DropForeignKey
ALTER TABLE "worker" DROP CONSTRAINT "worker_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "worker" DROP CONSTRAINT "worker_subaccountId_fkey";

-- DropForeignKey
ALTER TABLE "worker_document" DROP CONSTRAINT "worker_document_workerId_fkey";

-- DropTable
DROP TABLE "account";

-- DropTable
DROP TABLE "activity";

-- DropTable
DROP TABLE "bank_transfer_settings";

-- DropTable
DROP TABLE "billing_rule";

-- DropTable
DROP TABLE "contact";

-- DropTable
DROP TABLE "contact_assignee";

-- DropTable
DROP TABLE "deal";

-- DropTable
DROP TABLE "deal_contact";

-- DropTable
DROP TABLE "deal_member";

-- DropTable
DROP TABLE "form";

-- DropTable
DROP TABLE "form_field";

-- DropTable
DROP TABLE "form_step";

-- DropTable
DROP TABLE "form_submission";

-- DropTable
DROP TABLE "funnel";

-- DropTable
DROP TABLE "funnel_analytics";

-- DropTable
DROP TABLE "funnel_block";

-- DropTable
DROP TABLE "funnel_block_analytics";

-- DropTable
DROP TABLE "funnel_block_event";

-- DropTable
DROP TABLE "funnel_breakpoint";

-- DropTable
DROP TABLE "funnel_page";

-- DropTable
DROP TABLE "funnel_pixel_integration";

-- DropTable
DROP TABLE "global_style_preset";

-- DropTable
DROP TABLE "invitation";

-- DropTable
DROP TABLE "invoice";

-- DropTable
DROP TABLE "invoice_line_item";

-- DropTable
DROP TABLE "invoice_payment";

-- DropTable
DROP TABLE "invoice_reminder";

-- DropTable
DROP TABLE "invoice_template";

-- DropTable
DROP TABLE "member";

-- DropTable
DROP TABLE "notification";

-- DropTable
DROP TABLE "notification_preference";

-- DropTable
DROP TABLE "organization";

-- DropTable
DROP TABLE "payment_integration";

-- DropTable
DROP TABLE "pipeline";

-- DropTable
DROP TABLE "pipeline_stage";

-- DropTable
DROP TABLE "qr_code";

-- DropTable
DROP TABLE "recurring_invoice";

-- DropTable
DROP TABLE "recurring_invoice_generation";

-- DropTable
DROP TABLE "rota";

-- DropTable
DROP TABLE "session";

-- DropTable
DROP TABLE "smart_section";

-- DropTable
DROP TABLE "smart_section_instance";

-- DropTable
DROP TABLE "stripe_connection";

-- DropTable
DROP TABLE "studio_booking";

-- DropTable
DROP TABLE "studio_class";

-- DropTable
DROP TABLE "studio_membership";

-- DropTable
DROP TABLE "subaccount";

-- DropTable
DROP TABLE "subaccount_member";

-- DropTable
DROP TABLE "subaccount_module";

-- DropTable
DROP TABLE "time_log";

-- DropTable
DROP TABLE "user";

-- DropTable
DROP TABLE "user_presence";

-- DropTable
DROP TABLE "verification";

-- DropTable
DROP TABLE "worker";

-- DropTable
DROP TABLE "worker_document";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
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

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransferSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "routingNumber" TEXT,
    "iban" TEXT,
    "swiftBic" TEXT,
    "bankAddress" JSONB,
    "accountType" TEXT,
    "currency" TEXT DEFAULT 'GBP',
    "instructions" TEXT,
    "referenceFormat" TEXT,
    "autoReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderDays" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sortCode" TEXT,
    "transferType" TEXT DEFAULT 'UK_DOMESTIC',

    CONSTRAINT "BankTransferSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billingModel" "BillingModel" NOT NULL,
    "config" JSONB NOT NULL,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "generateDay" INTEGER,
    "defaultTerms" TEXT,
    "defaultNotes" TEXT,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 30,
    "defaultTaxRate" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "logo" TEXT,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "score" INTEGER DEFAULT 0,
    "type" "ContactType" NOT NULL DEFAULT 'LEAD',
    "source" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastInteractionAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lifecycleStage" "LifecycleStage",
    "organizationId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactAssignee" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "subaccountMemberId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "value" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "deadline" TIMESTAMP(3),
    "source" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pipelineId" TEXT,
    "pipelineStageId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealContact" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "DealContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealMember" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "subaccountMemberId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "isMultiStep" BOOLEAN NOT NULL DEFAULT false,
    "showProgress" BOOLEAN NOT NULL DEFAULT true,
    "submitUrl" TEXT,
    "successMessage" TEXT NOT NULL DEFAULT 'Thank you for your submission!',
    "redirectUrl" TEXT,
    "workflowId" TEXT,
    "stylePresetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "validation" JSONB,
    "options" JSONB,
    "defaultValue" TEXT,
    "showConditions" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "styles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormStep" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "showConditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "contactId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FunnelStatus" NOT NULL DEFAULT 'DRAFT',
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "stylePresetId" TEXT,
    "customDomain" TEXT,
    "domainType" "FunnelDomainType" NOT NULL DEFAULT 'SUBDOMAIN',
    "domainVerified" BOOLEAN NOT NULL DEFAULT false,
    "subdomain" TEXT,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelAnalytics" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "parentBlockId" TEXT,
    "type" "FunnelBlockType" NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "styles" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "targetWorkflowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "smartSectionId" TEXT,
    "smartSectionInstanceId" TEXT,

    CONSTRAINT "FunnelBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelBlockAnalytics" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagementTime" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelBlockAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelBlockEvent" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT,
    "parameters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelBlockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelBreakpoint" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "device" "DeviceType" NOT NULL,
    "styles" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelBreakpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelPage" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaImage" TEXT,
    "customCss" TEXT,
    "customJs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelPixelIntegration" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "provider" "PixelProvider" NOT NULL,
    "pixelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelPixelIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalStylePreset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#8b5cf6',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#1f2937',
    "mutedColor" TEXT NOT NULL DEFAULT '#6b7280',
    "borderColor" TEXT NOT NULL DEFAULT '#e5e7eb',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
    "headingFont" TEXT NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
    "fontSize" JSONB NOT NULL DEFAULT '{"lg": 18, "sm": 14, "xl": 20, "2xl": 24, "3xl": 30, "4xl": 36, "base": 16}',
    "fontWeight" JSONB NOT NULL DEFAULT '{"bold": 700, "medium": 500, "normal": 400, "semibold": 600}',
    "lineHeight" JSONB NOT NULL DEFAULT '{"tight": 1.25, "normal": 1.5, "relaxed": 1.75}',
    "spacing" JSONB NOT NULL DEFAULT '{"lg": 24, "md": 16, "sm": 8, "xl": 32, "xs": 4, "2xl": 48, "3xl": 64}',
    "borderRadius" JSONB NOT NULL DEFAULT '{"lg": 12, "md": 8, "sm": 4, "xl": 16, "full": 9999, "none": 0}',
    "buttonPresets" JSONB NOT NULL DEFAULT '{"outline": {"bg": "transparent", "text": "#3b82f6", "border": "2px solid #3b82f6", "padding": "12px 24px", "borderRadius": 8}, "primary": {"bg": "#3b82f6", "text": "#ffffff", "padding": "12px 24px", "borderRadius": 8}, "secondary": {"bg": "#8b5cf6", "text": "#ffffff", "padding": "12px 24px", "borderRadius": 8}}',
    "shadows" JSONB NOT NULL DEFAULT '{"lg": "0 10px 15px rgba(0,0,0,0.1)", "md": "0 4px 6px rgba(0,0,0,0.1)", "sm": "0 1px 2px rgba(0,0,0,0.05)", "xl": "0 20px 25px rgba(0,0,0,0.1)"}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalStylePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "contactId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactAddress" JSONB,
    "title" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "billingModel" "BillingModel" NOT NULL DEFAULT 'CUSTOM',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "internalNotes" TEXT,
    "termsConditions" TEXT,
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "xeroInvoiceId" TEXT,
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT,
    "bankTransferNotes" TEXT,
    "bankTransferProof" TEXT,
    "bankTransferStatus" "BankTransferStatus",
    "bankTransferVerifiedAt" TIMESTAMP(3),
    "bankTransferVerifiedBy" TEXT,
    "paymentMethods" "PaymentMethod"[] DEFAULT ARRAY[]::"PaymentMethod"[],

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "timeLogId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripePaymentId" TEXT,
    "xeroPaymentId" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReminder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentTo" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysOverdue" INTEGER,
    "isDunning" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL,
    "styles" JSONB NOT NULL,
    "variables" JSONB,
    "thumbnailUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'viewer',

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "subaccountId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "entityType" TEXT,
    "entityId" TEXT,
    "actorId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailDigest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "accentColor" TEXT,
    "brandColor" TEXT,
    "businessAddress" JSONB,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "dunningDays" JSONB,
    "dunningEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "provider" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "rottingDays" INTEGER,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dealId" TEXT,
    "location" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "RecurringInvoiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "contactId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactAddress" JSONB,
    "billingModel" "BillingModel" NOT NULL DEFAULT 'RETAINER',
    "templateId" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "lineItems" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dueDays" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "termsConditions" TEXT,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "sendReminders" BOOLEAN NOT NULL DEFAULT false,
    "lastRunDate" TIMESTAMP(3),
    "invoicesGenerated" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoiceGeneration" (
    "id" TEXT NOT NULL,
    "recurringInvoiceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoiceGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rota" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "workerId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyName" TEXT,
    "dealId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "status" "RotaStatus" NOT NULL DEFAULT 'SCHEDULED',
    "hourlyRate" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'GBP',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "customFields" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "magicLinkSentAt" TIMESTAMP(3),
    "color" TEXT DEFAULT 'blue',
    "actualEndTime" TIMESTAMP(3),
    "actualHours" DECIMAL(10,2),
    "actualStartTime" TIMESTAMP(3),
    "actualValue" DECIMAL(10,2),
    "scheduledHours" DECIMAL(10,2),
    "scheduledValue" DECIMAL(10,2),

    CONSTRAINT "Rota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,
    "activeSubaccountId" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartSection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "thumbnail" TEXT,
    "blockStructure" JSONB NOT NULL DEFAULT '[]',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartSectionInstance" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "funnelPageId" TEXT,
    "formId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SmartSectionInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "stripeAccountId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "businessName" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "applicationFeePercent" DECIMAL(5,2),
    "applicationFeeFixed" DECIMAL(10,2),
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioBooking" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "externalId" TEXT,
    "status" "StudioBookingStatus" NOT NULL DEFAULT 'BOOKED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "cancellationReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioClass" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructorName" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "maxCapacity" INTEGER,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "StudioClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioMembership" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" "StudioMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "totalClasses" INTEGER,
    "usedClasses" INTEGER DEFAULT 0,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subaccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "billingEmail" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "industry" TEXT,
    "logo" TEXT,
    "slug" TEXT,
    "accentColor" TEXT,
    "brandColor" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "taxId" TEXT,
    "dunningDays" JSONB,
    "dunningEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subaccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubaccountMember" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SubaccountMemberRole" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubaccountMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubaccountModule" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "moduleType" "ModuleType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "SubaccountModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "breakDuration" INTEGER,
    "checkInMethod" "CheckInMethod" NOT NULL DEFAULT 'MANUAL',
    "checkInLocation" JSONB,
    "checkOutLocation" JSONB,
    "qrCodeId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "status" "TimeLogStatus" NOT NULL DEFAULT 'DRAFT',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "hourlyRate" DECIMAL(10,2),
    "totalAmount" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "invoiceId" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workerId" TEXT,
    "organizationId" TEXT NOT NULL,
    "descriptionMode" TEXT DEFAULT 'single',
    "sections" JSONB,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "UserStatus" NOT NULL DEFAULT 'ONLINE',
    "statusMessage" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "subaccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "employeeId" TEXT,
    "portalToken" TEXT,
    "portalTokenExpiry" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "hourlyRate" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'GBP',
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankSortCode" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'United Kingdom',
    "county" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "emergencyContactEmail" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "firstName" TEXT,
    "gender" TEXT,
    "hasOwnTransport" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastName" TEXT,
    "maxHoursPerWeek" INTEGER,
    "nationalInsuranceNumber" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "postcode" TEXT,
    "preferredShiftTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profilePhoto" TEXT,
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionToken" TEXT,
    "sessionTokenExpiry" TIMESTAMP(3),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "travelRadius" INTEGER,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerDocument" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "type" "WorkerDocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "documentNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "issuingAuthority" TEXT,
    "status" "WorkerDocumentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "expiryNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "expiryNotificationDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_entityType_entityId_idx" ON "Activity"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_entityType_entityId_idx" ON "Activity"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_subaccountId_idx" ON "Activity"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "Activity_subaccountId_idx" ON "Activity"("subaccountId");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransferSettings_subaccountId_key" ON "BankTransferSettings"("subaccountId");

-- CreateIndex
CREATE INDEX "BankTransferSettings_enabled_idx" ON "BankTransferSettings"("enabled");

-- CreateIndex
CREATE INDEX "BankTransferSettings_organizationId_idx" ON "BankTransferSettings"("organizationId");

-- CreateIndex
CREATE INDEX "BankTransferSettings_subaccountId_idx" ON "BankTransferSettings"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransferSettings_organizationId_subaccountId_key" ON "BankTransferSettings"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "BillingRule_isActive_idx" ON "BillingRule"("isActive");

-- CreateIndex
CREATE INDEX "BillingRule_organizationId_idx" ON "BillingRule"("organizationId");

-- CreateIndex
CREATE INDEX "BillingRule_organizationId_subaccountId_idx" ON "BillingRule"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "BillingRule_subaccountId_idx" ON "BillingRule"("subaccountId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_subaccountId_idx" ON "Contact"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "Contact_subaccountId_email_idx" ON "Contact"("subaccountId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ContactAssignee_contactId_subaccountMemberId_key" ON "ContactAssignee"("contactId", "subaccountMemberId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_subaccountId_idx" ON "Deal"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "Deal_pipelineId_idx" ON "Deal"("pipelineId");

-- CreateIndex
CREATE INDEX "Deal_subaccountId_pipelineStageId_idx" ON "Deal"("subaccountId", "pipelineStageId");

-- CreateIndex
CREATE UNIQUE INDEX "DealContact_dealId_contactId_key" ON "DealContact"("dealId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "DealMember_dealId_subaccountMemberId_key" ON "DealMember"("dealId", "subaccountMemberId");

-- CreateIndex
CREATE INDEX "Form_organizationId_idx" ON "Form"("organizationId");

-- CreateIndex
CREATE INDEX "Form_status_idx" ON "Form"("status");

-- CreateIndex
CREATE INDEX "Form_subaccountId_idx" ON "Form"("subaccountId");

-- CreateIndex
CREATE INDEX "Form_workflowId_idx" ON "Form"("workflowId");

-- CreateIndex
CREATE INDEX "FormField_stepId_idx" ON "FormField"("stepId");

-- CreateIndex
CREATE INDEX "FormStep_formId_idx" ON "FormStep"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_contactId_idx" ON "FormSubmission"("contactId");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_submittedAt_idx" ON "FormSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "Funnel_customDomain_idx" ON "Funnel"("customDomain");

-- CreateIndex
CREATE INDEX "Funnel_organizationId_idx" ON "Funnel"("organizationId");

-- CreateIndex
CREATE INDEX "Funnel_organizationId_subaccountId_idx" ON "Funnel"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "Funnel_status_idx" ON "Funnel"("status");

-- CreateIndex
CREATE INDEX "Funnel_subaccountId_idx" ON "Funnel"("subaccountId");

-- CreateIndex
CREATE INDEX "Funnel_subdomain_idx" ON "Funnel"("subdomain");

-- CreateIndex
CREATE INDEX "FunnelAnalytics_funnelId_date_idx" ON "FunnelAnalytics"("funnelId", "date");

-- CreateIndex
CREATE INDEX "FunnelAnalytics_pageId_date_idx" ON "FunnelAnalytics"("pageId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelAnalytics_funnelId_pageId_date_key" ON "FunnelAnalytics"("funnelId", "pageId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelBlock_smartSectionInstanceId_key" ON "FunnelBlock"("smartSectionInstanceId");

-- CreateIndex
CREATE INDEX "FunnelBlock_pageId_idx" ON "FunnelBlock"("pageId");

-- CreateIndex
CREATE INDEX "FunnelBlock_pageId_order_idx" ON "FunnelBlock"("pageId", "order");

-- CreateIndex
CREATE INDEX "FunnelBlock_pageId_parentBlockId_order_idx" ON "FunnelBlock"("pageId", "parentBlockId", "order");

-- CreateIndex
CREATE INDEX "FunnelBlock_parentBlockId_idx" ON "FunnelBlock"("parentBlockId");

-- CreateIndex
CREATE INDEX "FunnelBlock_smartSectionId_idx" ON "FunnelBlock"("smartSectionId");

-- CreateIndex
CREATE INDEX "FunnelBlock_smartSectionId_order_idx" ON "FunnelBlock"("smartSectionId", "order");

-- CreateIndex
CREATE INDEX "FunnelBlock_smartSectionInstanceId_idx" ON "FunnelBlock"("smartSectionInstanceId");

-- CreateIndex
CREATE INDEX "FunnelBlockAnalytics_blockId_date_idx" ON "FunnelBlockAnalytics"("blockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelBlockAnalytics_blockId_date_key" ON "FunnelBlockAnalytics"("blockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelBlockEvent_blockId_key" ON "FunnelBlockEvent"("blockId");

-- CreateIndex
CREATE INDEX "FunnelBlockEvent_blockId_idx" ON "FunnelBlockEvent"("blockId");

-- CreateIndex
CREATE INDEX "FunnelBreakpoint_blockId_idx" ON "FunnelBreakpoint"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelBreakpoint_blockId_device_key" ON "FunnelBreakpoint"("blockId", "device");

-- CreateIndex
CREATE INDEX "FunnelPage_funnelId_idx" ON "FunnelPage"("funnelId");

-- CreateIndex
CREATE INDEX "FunnelPage_funnelId_order_idx" ON "FunnelPage"("funnelId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelPage_funnelId_slug_key" ON "FunnelPage"("funnelId", "slug");

-- CreateIndex
CREATE INDEX "FunnelPixelIntegration_funnelId_idx" ON "FunnelPixelIntegration"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelPixelIntegration_funnelId_provider_key" ON "FunnelPixelIntegration"("funnelId", "provider");

-- CreateIndex
CREATE INDEX "GlobalStylePreset_organizationId_idx" ON "GlobalStylePreset"("organizationId");

-- CreateIndex
CREATE INDEX "GlobalStylePreset_subaccountId_idx" ON "GlobalStylePreset"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_contactId_idx" ON "Invoice"("contactId");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_subaccountId_idx" ON "Invoice"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_subaccountId_idx" ON "Invoice"("subaccountId");

-- CreateIndex
CREATE INDEX "Invoice_templateId_idx" ON "Invoice"("templateId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_timeLogId_idx" ON "InvoiceLineItem"("timeLogId");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_paidAt_idx" ON "InvoicePayment"("paidAt");

-- CreateIndex
CREATE INDEX "InvoiceReminder_invoiceId_idx" ON "InvoiceReminder"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceReminder_isDunning_idx" ON "InvoiceReminder"("isDunning");

-- CreateIndex
CREATE INDEX "InvoiceReminder_sentAt_idx" ON "InvoiceReminder"("sentAt");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_isDefault_idx" ON "InvoiceTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_organizationId_idx" ON "InvoiceTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_organizationId_subaccountId_idx" ON "InvoiceTemplate"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_subaccountId_idx" ON "InvoiceTemplate"("subaccountId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_subaccountId_idx" ON "Notification"("subaccountId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "PaymentIntegration_organizationId_idx" ON "PaymentIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentIntegration_subaccountId_idx" ON "PaymentIntegration"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntegration_organizationId_provider_key" ON "PaymentIntegration"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntegration_subaccountId_provider_key" ON "PaymentIntegration"("subaccountId", "provider");

-- CreateIndex
CREATE INDEX "Pipeline_organizationId_subaccountId_idx" ON "Pipeline"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "Pipeline_subaccountId_isActive_idx" ON "Pipeline"("subaccountId", "isActive");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_idx" ON "PipelineStage"("pipelineId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_position_key" ON "PipelineStage"("pipelineId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_code_key" ON "QRCode"("code");

-- CreateIndex
CREATE INDEX "QRCode_code_idx" ON "QRCode"("code");

-- CreateIndex
CREATE INDEX "QRCode_organizationId_idx" ON "QRCode"("organizationId");

-- CreateIndex
CREATE INDEX "QRCode_organizationId_subaccountId_idx" ON "QRCode"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "QRCode_subaccountId_idx" ON "QRCode"("subaccountId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_frequency_idx" ON "RecurringInvoice"("frequency");

-- CreateIndex
CREATE INDEX "RecurringInvoice_nextRunDate_idx" ON "RecurringInvoice"("nextRunDate");

-- CreateIndex
CREATE INDEX "RecurringInvoice_organizationId_idx" ON "RecurringInvoice"("organizationId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_status_idx" ON "RecurringInvoice"("status");

-- CreateIndex
CREATE INDEX "RecurringInvoice_subaccountId_idx" ON "RecurringInvoice"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInvoiceGeneration_invoiceId_key" ON "RecurringInvoiceGeneration"("invoiceId");

-- CreateIndex
CREATE INDEX "RecurringInvoiceGeneration_recurringInvoiceId_idx" ON "RecurringInvoiceGeneration"("recurringInvoiceId");

-- CreateIndex
CREATE INDEX "Rota_contactId_idx" ON "Rota"("contactId");

-- CreateIndex
CREATE INDEX "Rota_organizationId_idx" ON "Rota"("organizationId");

-- CreateIndex
CREATE INDEX "Rota_organizationId_workerId_startTime_idx" ON "Rota"("organizationId", "workerId", "startTime");

-- CreateIndex
CREATE INDEX "Rota_organizationId_workerId_status_idx" ON "Rota"("organizationId", "workerId", "status");

-- CreateIndex
CREATE INDEX "Rota_startTime_idx" ON "Rota"("startTime");

-- CreateIndex
CREATE INDEX "Rota_status_idx" ON "Rota"("status");

-- CreateIndex
CREATE INDEX "Rota_subaccountId_idx" ON "Rota"("subaccountId");

-- CreateIndex
CREATE INDEX "Rota_workerId_idx" ON "Rota"("workerId");

-- CreateIndex
CREATE INDEX "Rota_workerId_startTime_endTime_idx" ON "Rota"("workerId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "SmartSection_category_idx" ON "SmartSection"("category");

-- CreateIndex
CREATE INDEX "SmartSection_organizationId_idx" ON "SmartSection"("organizationId");

-- CreateIndex
CREATE INDEX "SmartSection_subaccountId_idx" ON "SmartSection"("subaccountId");

-- CreateIndex
CREATE INDEX "SmartSectionInstance_formId_idx" ON "SmartSectionInstance"("formId");

-- CreateIndex
CREATE INDEX "SmartSectionInstance_funnelPageId_idx" ON "SmartSectionInstance"("funnelPageId");

-- CreateIndex
CREATE INDEX "SmartSectionInstance_sectionId_idx" ON "SmartSectionInstance"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnection_subaccountId_key" ON "StripeConnection"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnection_stripeAccountId_key" ON "StripeConnection"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeConnection_organizationId_idx" ON "StripeConnection"("organizationId");

-- CreateIndex
CREATE INDEX "StripeConnection_stripeAccountId_idx" ON "StripeConnection"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeConnection_subaccountId_idx" ON "StripeConnection"("subaccountId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnection_organizationId_subaccountId_key" ON "StripeConnection"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "StudioBooking_classId_idx" ON "StudioBooking"("classId");

-- CreateIndex
CREATE INDEX "StudioBooking_contactId_idx" ON "StudioBooking"("contactId");

-- CreateIndex
CREATE INDEX "StudioBooking_externalId_idx" ON "StudioBooking"("externalId");

-- CreateIndex
CREATE INDEX "StudioBooking_status_idx" ON "StudioBooking"("status");

-- CreateIndex
CREATE INDEX "StudioClass_externalId_idx" ON "StudioClass"("externalId");

-- CreateIndex
CREATE INDEX "StudioClass_organizationId_idx" ON "StudioClass"("organizationId");

-- CreateIndex
CREATE INDEX "StudioClass_startTime_idx" ON "StudioClass"("startTime");

-- CreateIndex
CREATE INDEX "StudioClass_subaccountId_idx" ON "StudioClass"("subaccountId");

-- CreateIndex
CREATE INDEX "StudioMembership_contactId_idx" ON "StudioMembership"("contactId");

-- CreateIndex
CREATE INDEX "StudioMembership_endDate_idx" ON "StudioMembership"("endDate");

-- CreateIndex
CREATE INDEX "StudioMembership_externalId_idx" ON "StudioMembership"("externalId");

-- CreateIndex
CREATE INDEX "StudioMembership_status_idx" ON "StudioMembership"("status");

-- CreateIndex
CREATE INDEX "Subaccount_organizationId_idx" ON "Subaccount"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SubaccountMember_subaccountId_userId_key" ON "SubaccountMember"("subaccountId", "userId");

-- CreateIndex
CREATE INDEX "SubaccountModule_organizationId_enabled_idx" ON "SubaccountModule"("organizationId", "enabled");

-- CreateIndex
CREATE INDEX "SubaccountModule_subaccountId_enabled_idx" ON "SubaccountModule"("subaccountId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SubaccountModule_organizationId_moduleType_key" ON "SubaccountModule"("organizationId", "moduleType");

-- CreateIndex
CREATE UNIQUE INDEX "SubaccountModule_subaccountId_moduleType_key" ON "SubaccountModule"("subaccountId", "moduleType");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_contactId_idx" ON "TimeLog"("organizationId", "contactId");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_dealId_idx" ON "TimeLog"("organizationId", "dealId");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_idx" ON "TimeLog"("organizationId");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_startTime_idx" ON "TimeLog"("organizationId", "startTime");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_status_idx" ON "TimeLog"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_subaccountId_idx" ON "TimeLog"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_workerId_idx" ON "TimeLog"("organizationId", "workerId");

-- CreateIndex
CREATE INDEX "TimeLog_organizationId_workerId_startTime_idx" ON "TimeLog"("organizationId", "workerId", "startTime");

-- CreateIndex
CREATE INDEX "TimeLog_status_invoiceId_idx" ON "TimeLog"("status", "invoiceId");

-- CreateIndex
CREATE INDEX "TimeLog_subaccountId_idx" ON "TimeLog"("subaccountId");

-- CreateIndex
CREATE INDEX "TimeLog_workerId_status_idx" ON "TimeLog"("workerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPresence_userId_key" ON "UserPresence"("userId");

-- CreateIndex
CREATE INDEX "UserPresence_organizationId_idx" ON "UserPresence"("organizationId");

-- CreateIndex
CREATE INDEX "UserPresence_subaccountId_idx" ON "UserPresence"("subaccountId");

-- CreateIndex
CREATE INDEX "UserPresence_userId_status_idx" ON "UserPresence"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_portalToken_key" ON "Worker"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_sessionToken_key" ON "Worker"("sessionToken");

-- CreateIndex
CREATE INDEX "Worker_email_idx" ON "Worker"("email");

-- CreateIndex
CREATE INDEX "Worker_organizationId_idx" ON "Worker"("organizationId");

-- CreateIndex
CREATE INDEX "Worker_organizationId_subaccountId_idx" ON "Worker"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "Worker_phone_idx" ON "Worker"("phone");

-- CreateIndex
CREATE INDEX "Worker_portalToken_idx" ON "Worker"("portalToken");

-- CreateIndex
CREATE INDEX "Worker_sessionToken_idx" ON "Worker"("sessionToken");

-- CreateIndex
CREATE INDEX "Worker_subaccountId_idx" ON "Worker"("subaccountId");

-- CreateIndex
CREATE INDEX "WorkerDocument_expiryDate_idx" ON "WorkerDocument"("expiryDate");

-- CreateIndex
CREATE INDEX "WorkerDocument_status_idx" ON "WorkerDocument"("status");

-- CreateIndex
CREATE INDEX "WorkerDocument_type_idx" ON "WorkerDocument"("type");

-- CreateIndex
CREATE INDEX "WorkerDocument_workerId_idx" ON "WorkerDocument"("workerId");

-- CreateIndex
CREATE INDEX "WorkerDocument_workerId_status_idx" ON "WorkerDocument"("workerId", "status");

-- CreateIndex
CREATE INDEX "WorkerDocument_workerId_type_idx" ON "WorkerDocument"("workerId", "type");

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILog" ADD CONSTRAINT "AILog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apps" ADD CONSTRAINT "Apps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailSubscription" ADD CONSTRAINT "GmailSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarSubscription" ADD CONSTRAINT "GoogleCalendarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneDriveSubscription" ADD CONSTRAINT "OneDriveSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutlookSubscription" ADD CONSTRAINT "OutlookSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransferSettings" ADD CONSTRAINT "BankTransferSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransferSettings" ADD CONSTRAINT "BankTransferSettings_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAssignee" ADD CONSTRAINT "ContactAssignee_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAssignee" ADD CONSTRAINT "ContactAssignee_subaccountMemberId_fkey" FOREIGN KEY ("subaccountMemberId") REFERENCES "SubaccountMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMember" ADD CONSTRAINT "DealMember_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMember" ADD CONSTRAINT "DealMember_subaccountMemberId_fkey" FOREIGN KEY ("subaccountMemberId") REFERENCES "SubaccountMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "GlobalStylePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "FormStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormStep" ADD CONSTRAINT "FormStep_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "GlobalStylePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelAnalytics" ADD CONSTRAINT "FunnelAnalytics_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelAnalytics" ADD CONSTRAINT "FunnelAnalytics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FunnelPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FunnelPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_parentBlockId_fkey" FOREIGN KEY ("parentBlockId") REFERENCES "FunnelBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_smartSectionId_fkey" FOREIGN KEY ("smartSectionId") REFERENCES "SmartSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelBlock" ADD CONSTRAINT "FunnelBlock_smartSectionInstanceId_fkey" FOREIGN KEY ("smartSectionInstanceId") REFERENCES "SmartSectionInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelBlockAnalytics" ADD CONSTRAINT "FunnelBlockAnalytics_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "FunnelBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelBlockEvent" ADD CONSTRAINT "FunnelBlockEvent_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "FunnelBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelBreakpoint" ADD CONSTRAINT "FunnelBreakpoint_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "FunnelBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelPage" ADD CONSTRAINT "FunnelPage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelPixelIntegration" ADD CONSTRAINT "FunnelPixelIntegration_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalStylePreset" ADD CONSTRAINT "GlobalStylePreset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalStylePreset" ADD CONSTRAINT "GlobalStylePreset_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InvoiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceGeneration" ADD CONSTRAINT "RecurringInvoiceGeneration_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rota" ADD CONSTRAINT "Rota_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartSection" ADD CONSTRAINT "SmartSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartSection" ADD CONSTRAINT "SmartSection_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartSectionInstance" ADD CONSTRAINT "SmartSectionInstance_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartSectionInstance" ADD CONSTRAINT "SmartSectionInstance_funnelPageId_fkey" FOREIGN KEY ("funnelPageId") REFERENCES "FunnelPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartSectionInstance" ADD CONSTRAINT "SmartSectionInstance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SmartSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeConnection" ADD CONSTRAINT "StripeConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeConnection" ADD CONSTRAINT "StripeConnection_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioBooking" ADD CONSTRAINT "StudioBooking_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudioClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioBooking" ADD CONSTRAINT "StudioBooking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioMembership" ADD CONSTRAINT "StudioMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subaccount" ADD CONSTRAINT "Subaccount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subaccount" ADD CONSTRAINT "Subaccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubaccountMember" ADD CONSTRAINT "SubaccountMember_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubaccountMember" ADD CONSTRAINT "SubaccountMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubaccountModule" ADD CONSTRAINT "SubaccountModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubaccountModule" ADD CONSTRAINT "SubaccountModule_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
