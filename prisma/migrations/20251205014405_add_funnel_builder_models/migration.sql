-- CreateEnum
CREATE TYPE "FunnelStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FunnelBlockType" AS ENUM ('CONTAINER', 'ONE_COLUMN', 'TWO_COLUMN', 'THREE_COLUMN', 'SECTION', 'HEADING', 'PARAGRAPH', 'LABEL', 'RICH_TEXT', 'IMAGE', 'VIDEO', 'ICON', 'INPUT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'BUTTON', 'FORM', 'CARD', 'FAQ', 'TESTIMONIAL', 'PRICING', 'FEATURE_GRID', 'IFRAME', 'CUSTOM_HTML', 'SCRIPT');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'TABLET', 'MOBILE');

-- CreateTable
CREATE TABLE "funnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FunnelStatus" NOT NULL DEFAULT 'DRAFT',
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_page" (
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

    CONSTRAINT "funnel_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_block" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
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

    CONSTRAINT "funnel_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_breakpoint" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "device" "DeviceType" NOT NULL,
    "styles" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_breakpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funnel_organizationId_idx" ON "funnel"("organizationId");

-- CreateIndex
CREATE INDEX "funnel_subaccountId_idx" ON "funnel"("subaccountId");

-- CreateIndex
CREATE INDEX "funnel_organizationId_subaccountId_idx" ON "funnel"("organizationId", "subaccountId");

-- CreateIndex
CREATE INDEX "funnel_status_idx" ON "funnel"("status");

-- CreateIndex
CREATE INDEX "funnel_page_funnelId_idx" ON "funnel_page"("funnelId");

-- CreateIndex
CREATE INDEX "funnel_page_funnelId_order_idx" ON "funnel_page"("funnelId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_page_funnelId_slug_key" ON "funnel_page"("funnelId", "slug");

-- CreateIndex
CREATE INDEX "funnel_block_pageId_idx" ON "funnel_block"("pageId");

-- CreateIndex
CREATE INDEX "funnel_block_parentBlockId_idx" ON "funnel_block"("parentBlockId");

-- CreateIndex
CREATE INDEX "funnel_block_pageId_order_idx" ON "funnel_block"("pageId", "order");

-- CreateIndex
CREATE INDEX "funnel_block_pageId_parentBlockId_order_idx" ON "funnel_block"("pageId", "parentBlockId", "order");

-- CreateIndex
CREATE INDEX "funnel_breakpoint_blockId_idx" ON "funnel_breakpoint"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_breakpoint_blockId_device_key" ON "funnel_breakpoint"("blockId", "device");

-- AddForeignKey
ALTER TABLE "funnel" ADD CONSTRAINT "funnel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel" ADD CONSTRAINT "funnel_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_page" ADD CONSTRAINT "funnel_page_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_block" ADD CONSTRAINT "funnel_block_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "funnel_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_block" ADD CONSTRAINT "funnel_block_parentBlockId_fkey" FOREIGN KEY ("parentBlockId") REFERENCES "funnel_block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_breakpoint" ADD CONSTRAINT "funnel_breakpoint_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "funnel_block"("id") ON DELETE CASCADE ON UPDATE CASCADE;
