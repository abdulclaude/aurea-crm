-- CreateEnum
CREATE TYPE "StudioMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED');

-- CreateEnum
CREATE TYPE "StudioBookingStatus" AS ENUM ('BOOKED', 'ATTENDED', 'CANCELLED', 'NO_SHOW', 'LATE_CANCEL');

-- CreateTable
CREATE TABLE "studio_class" (
    "id" TEXT NOT NULL,
    "subaccountId" TEXT NOT NULL,
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

    CONSTRAINT "studio_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_booking" (
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

    CONSTRAINT "studio_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_membership" (
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

    CONSTRAINT "studio_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_class_subaccountId_idx" ON "studio_class"("subaccountId");

-- CreateIndex
CREATE INDEX "studio_class_startTime_idx" ON "studio_class"("startTime");

-- CreateIndex
CREATE INDEX "studio_class_externalId_idx" ON "studio_class"("externalId");

-- CreateIndex
CREATE INDEX "studio_booking_classId_idx" ON "studio_booking"("classId");

-- CreateIndex
CREATE INDEX "studio_booking_contactId_idx" ON "studio_booking"("contactId");

-- CreateIndex
CREATE INDEX "studio_booking_status_idx" ON "studio_booking"("status");

-- CreateIndex
CREATE INDEX "studio_booking_externalId_idx" ON "studio_booking"("externalId");

-- CreateIndex
CREATE INDEX "studio_membership_contactId_idx" ON "studio_membership"("contactId");

-- CreateIndex
CREATE INDEX "studio_membership_status_idx" ON "studio_membership"("status");

-- CreateIndex
CREATE INDEX "studio_membership_endDate_idx" ON "studio_membership"("endDate");

-- CreateIndex
CREATE INDEX "studio_membership_externalId_idx" ON "studio_membership"("externalId");

-- AddForeignKey
ALTER TABLE "studio_class" ADD CONSTRAINT "studio_class_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "subaccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_booking" ADD CONSTRAINT "studio_booking_classId_fkey" FOREIGN KEY ("classId") REFERENCES "studio_class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_booking" ADD CONSTRAINT "studio_booking_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_membership" ADD CONSTRAINT "studio_membership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
