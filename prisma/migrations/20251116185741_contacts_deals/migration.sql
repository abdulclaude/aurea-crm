-- CreateEnum
CREATE TYPE "SubaccountMemberRole" AS ENUM ('AGENCY', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('LEAD', 'PROSPECT', 'CUSTOMER', 'CHURN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('LEAD_IN', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "subaccount_member" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SubaccountMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subaccount_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
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
    "lifecycleStage" TEXT,
    "source" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastInteractionAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_assignee" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "subaccountMemberId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_assignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'LEAD_IN',
    "value" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "probability" INTEGER DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "source" TEXT,
    "pipeline" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_member" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "subaccountMemberId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_contact" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "deal_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subaccount_member_subaccountId_userId_key" ON "subaccount_member"("subaccountId", "userId");

-- CreateIndex
CREATE INDEX "contact_subaccountId_email_idx" ON "contact"("subaccountId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "contact_assignee_contactId_subaccountMemberId_key" ON "contact_assignee"("contactId", "subaccountMemberId");

-- CreateIndex
CREATE INDEX "deal_subaccountId_stage_idx" ON "deal"("subaccountId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "deal_member_dealId_subaccountMemberId_key" ON "deal_member"("dealId", "subaccountMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_contact_dealId_contactId_key" ON "deal_contact"("dealId", "contactId");

-- AddForeignKey
ALTER TABLE "subaccount_member" ADD CONSTRAINT "subaccount_member_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subaccount_member" ADD CONSTRAINT "subaccount_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_assignee" ADD CONSTRAINT "contact_assignee_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_assignee" ADD CONSTRAINT "contact_assignee_subaccountMemberId_fkey" FOREIGN KEY ("subaccountMemberId") REFERENCES "subaccount_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal" ADD CONSTRAINT "deal_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_member" ADD CONSTRAINT "deal_member_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_member" ADD CONSTRAINT "deal_member_subaccountMemberId_fkey" FOREIGN KEY ("subaccountMemberId") REFERENCES "subaccount_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_contact" ADD CONSTRAINT "deal_contact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_contact" ADD CONSTRAINT "deal_contact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
