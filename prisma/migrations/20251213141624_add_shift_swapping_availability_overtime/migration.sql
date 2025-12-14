-- CreateEnum
CREATE TYPE "ShiftSwapStatus" AS ENUM ('PENDING', 'WORKER_ACCEPTED', 'WORKER_REJECTED', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'PARENTAL', 'UNPAID', 'COMPENSATORY', 'PUBLIC_HOLIDAY', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppProvider" ADD VALUE 'GOOGLE_DRIVE';
ALTER TYPE "AppProvider" ADD VALUE 'GOOGLE_FORMS';

-- AlterTable
ALTER TABLE "TimeLog" ADD COLUMN     "complianceFlags" JSONB,
ADD COLUMN     "isOvertime" BOOLEAN DEFAULT false,
ADD COLUMN     "overtimeHours" DECIMAL(6,2);

-- CreateTable
CREATE TABLE "ShiftSwapRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "rotaId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetWorkerId" TEXT,
    "status" "ShiftSwapStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "adminApprovedAt" TIMESTAMP(3),
    "adminApprovedBy" TEXT,
    "adminRejectedAt" TIMESTAMP(3),
    "adminRejectedBy" TEXT,
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notificationsSent" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerAvailability" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOffRequest" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subaccountId" TEXT,
    "type" "TimeOffType" NOT NULL DEFAULT 'VACATION',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "endHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "totalDays" DECIMAL(4,1) NOT NULL,
    "reason" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeTracking" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "regularHours" DECIMAL(6,2) NOT NULL,
    "overtimeHours" DECIMAL(6,2) NOT NULL,
    "totalHours" DECIMAL(6,2) NOT NULL,
    "weeklyLimit" DECIMAL(6,2),
    "isOverLimit" BOOLEAN NOT NULL DEFAULT false,
    "complianceFlags" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_organizationId_idx" ON "ShiftSwapRequest"("organizationId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_subaccountId_idx" ON "ShiftSwapRequest"("subaccountId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_rotaId_idx" ON "ShiftSwapRequest"("rotaId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requesterId_idx" ON "ShiftSwapRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_targetWorkerId_idx" ON "ShiftSwapRequest"("targetWorkerId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_status_idx" ON "ShiftSwapRequest"("status");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_organizationId_status_idx" ON "ShiftSwapRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requestedAt_idx" ON "ShiftSwapRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "WorkerAvailability_workerId_idx" ON "WorkerAvailability"("workerId");

-- CreateIndex
CREATE INDEX "WorkerAvailability_organizationId_idx" ON "WorkerAvailability"("organizationId");

-- CreateIndex
CREATE INDEX "WorkerAvailability_dayOfWeek_idx" ON "WorkerAvailability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "WorkerAvailability_workerId_dayOfWeek_isActive_idx" ON "WorkerAvailability"("workerId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "TimeOffRequest_workerId_idx" ON "TimeOffRequest"("workerId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_organizationId_idx" ON "TimeOffRequest"("organizationId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_subaccountId_idx" ON "TimeOffRequest"("subaccountId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_status_idx" ON "TimeOffRequest"("status");

-- CreateIndex
CREATE INDEX "TimeOffRequest_startDate_endDate_idx" ON "TimeOffRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "TimeOffRequest_workerId_status_idx" ON "TimeOffRequest"("workerId", "status");

-- CreateIndex
CREATE INDEX "TimeOffRequest_organizationId_status_idx" ON "TimeOffRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OvertimeTracking_workerId_idx" ON "OvertimeTracking"("workerId");

-- CreateIndex
CREATE INDEX "OvertimeTracking_organizationId_idx" ON "OvertimeTracking"("organizationId");

-- CreateIndex
CREATE INDEX "OvertimeTracking_weekStartDate_idx" ON "OvertimeTracking"("weekStartDate");

-- CreateIndex
CREATE INDEX "OvertimeTracking_isOverLimit_idx" ON "OvertimeTracking"("isOverLimit");

-- CreateIndex
CREATE INDEX "OvertimeTracking_workerId_weekStartDate_idx" ON "OvertimeTracking"("workerId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeTracking_workerId_weekStartDate_key" ON "OvertimeTracking"("workerId", "weekStartDate");

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "Rota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_targetWorkerId_fkey" FOREIGN KEY ("targetWorkerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerAvailability" ADD CONSTRAINT "WorkerAvailability_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerAvailability" ADD CONSTRAINT "WorkerAvailability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "Subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeTracking" ADD CONSTRAINT "OvertimeTracking_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeTracking" ADD CONSTRAINT "OvertimeTracking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
