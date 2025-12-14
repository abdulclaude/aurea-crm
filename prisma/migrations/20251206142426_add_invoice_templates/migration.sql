-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "invoice_template" (
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

    CONSTRAINT "invoice_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_template_organizationId_idx" ON "invoice_template"("organizationId");

-- CreateIndex
CREATE INDEX "invoice_template_subaccountId_idx" ON "invoice_template"("subaccountId");

-- CreateIndex
CREATE INDEX "invoice_template_organizationId_subaccountId_idx" ON "invoice_template"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "invoice_template_isDefault_idx" ON "invoice_template"("isDefault");

-- CreateIndex
CREATE INDEX "invoice_templateId_idx" ON "invoice"("templateId");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "invoice_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
