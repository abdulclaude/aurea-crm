-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'URL', 'DATE', 'TIME', 'DATETIME', 'SELECT', 'RADIO', 'CHECKBOX', 'MULTI_SELECT', 'FILE_UPLOAD', 'RATING', 'SLIDER', 'SIGNATURE', 'PAYMENT');

-- AlterTable
ALTER TABLE "funnel" ADD COLUMN     "stylePresetId" TEXT;

-- CreateTable
CREATE TABLE "global_style_preset" (
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
    "fontSize" JSONB NOT NULL DEFAULT '{"base":16,"sm":14,"lg":18,"xl":20,"2xl":24,"3xl":30,"4xl":36}',
    "fontWeight" JSONB NOT NULL DEFAULT '{"normal":400,"medium":500,"semibold":600,"bold":700}',
    "lineHeight" JSONB NOT NULL DEFAULT '{"tight":1.25,"normal":1.5,"relaxed":1.75}',
    "spacing" JSONB NOT NULL DEFAULT '{"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"2xl":48,"3xl":64}',
    "borderRadius" JSONB NOT NULL DEFAULT '{"none":0,"sm":4,"md":8,"lg":12,"xl":16,"full":9999}',
    "buttonPresets" JSONB NOT NULL DEFAULT '{"primary":{"bg":"#3b82f6","text":"#ffffff","borderRadius":8,"padding":"12px 24px"},"secondary":{"bg":"#8b5cf6","text":"#ffffff","borderRadius":8,"padding":"12px 24px"},"outline":{"bg":"transparent","text":"#3b82f6","border":"2px solid #3b82f6","borderRadius":8,"padding":"12px 24px"}}',
    "shadows" JSONB NOT NULL DEFAULT '{"sm":"0 1px 2px rgba(0,0,0,0.05)","md":"0 4px 6px rgba(0,0,0,0.1)","lg":"0 10px 15px rgba(0,0,0,0.1)","xl":"0 20px 25px rgba(0,0,0,0.1)"}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_style_preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_section" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "thumbnail" TEXT,
    "blockStructure" JSONB NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_section_instance" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "funnelPageId" TEXT,
    "formId" TEXT,
    "rootBlockId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_section_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form" (
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

    CONSTRAINT "form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_step" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "showConditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_field" (
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

    CONSTRAINT "form_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submission" (
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

    CONSTRAINT "form_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "global_style_preset_organizationId_idx" ON "global_style_preset"("organizationId");

-- CreateIndex
CREATE INDEX "global_style_preset_subaccountId_idx" ON "global_style_preset"("subaccountId");

-- CreateIndex
CREATE INDEX "smart_section_organizationId_idx" ON "smart_section"("organizationId");

-- CreateIndex
CREATE INDEX "smart_section_subaccountId_idx" ON "smart_section"("subaccountId");

-- CreateIndex
CREATE INDEX "smart_section_category_idx" ON "smart_section"("category");

-- CreateIndex
CREATE UNIQUE INDEX "smart_section_instance_rootBlockId_key" ON "smart_section_instance"("rootBlockId");

-- CreateIndex
CREATE INDEX "smart_section_instance_sectionId_idx" ON "smart_section_instance"("sectionId");

-- CreateIndex
CREATE INDEX "smart_section_instance_funnelPageId_idx" ON "smart_section_instance"("funnelPageId");

-- CreateIndex
CREATE INDEX "smart_section_instance_formId_idx" ON "smart_section_instance"("formId");

-- CreateIndex
CREATE INDEX "form_organizationId_idx" ON "form"("organizationId");

-- CreateIndex
CREATE INDEX "form_subaccountId_idx" ON "form"("subaccountId");

-- CreateIndex
CREATE INDEX "form_status_idx" ON "form"("status");

-- CreateIndex
CREATE INDEX "form_workflowId_idx" ON "form"("workflowId");

-- CreateIndex
CREATE INDEX "form_step_formId_idx" ON "form_step"("formId");

-- CreateIndex
CREATE INDEX "form_field_stepId_idx" ON "form_field"("stepId");

-- CreateIndex
CREATE INDEX "form_submission_formId_idx" ON "form_submission"("formId");

-- CreateIndex
CREATE INDEX "form_submission_contactId_idx" ON "form_submission"("contactId");

-- CreateIndex
CREATE INDEX "form_submission_submittedAt_idx" ON "form_submission"("submittedAt");

-- AddForeignKey
ALTER TABLE "funnel" ADD CONSTRAINT "funnel_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "global_style_preset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_style_preset" ADD CONSTRAINT "global_style_preset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_style_preset" ADD CONSTRAINT "global_style_preset_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_section" ADD CONSTRAINT "smart_section_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_section" ADD CONSTRAINT "smart_section_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_section_instance" ADD CONSTRAINT "smart_section_instance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "smart_section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_section_instance" ADD CONSTRAINT "smart_section_instance_funnelPageId_fkey" FOREIGN KEY ("funnelPageId") REFERENCES "funnel_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_section_instance" ADD CONSTRAINT "smart_section_instance_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form" ADD CONSTRAINT "form_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form" ADD CONSTRAINT "form_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form" ADD CONSTRAINT "form_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form" ADD CONSTRAINT "form_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "global_style_preset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_step" ADD CONSTRAINT "form_step_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field" ADD CONSTRAINT "form_field_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "form_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
