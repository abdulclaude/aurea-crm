/*
  Warnings:

  - A unique constraint covering the columns `[sessionToken]` on the table `worker` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "WorkerDocumentType" AS ENUM ('PASSPORT', 'DRIVING_LICENCE', 'NATIONAL_ID', 'VISA', 'RIGHT_TO_WORK', 'BIRTH_CERTIFICATE', 'DBS_CERTIFICATE', 'DBS_UPDATE_SERVICE', 'PROOF_OF_ADDRESS', 'PROOF_OF_NI', 'QUALIFICATION', 'CERTIFICATION', 'TRAINING_CERTIFICATE', 'FIRST_AID_CERTIFICATE', 'FOOD_HYGIENE', 'MANUAL_HANDLING', 'SAFEGUARDING', 'CONTRACT', 'SIGNED_POLICY', 'REFERENCE', 'HEALTH_DECLARATION', 'FIT_NOTE', 'VACCINATION_RECORD', 'OCCUPATIONAL_HEALTH', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkerDocumentStatus" AS ENUM ('PENDING_UPLOAD', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "worker" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankSortCode" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'United Kingdom',
ADD COLUMN     "county" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContactEmail" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelation" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "hasOwnTransport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "maxHoursPerWeek" INTEGER,
ADD COLUMN     "nationalInsuranceNumber" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "preferredShiftTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "profilePhoto" TEXT,
ADD COLUMN     "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sessionToken" TEXT,
ADD COLUMN     "sessionTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "travelRadius" INTEGER,
ALTER COLUMN "currency" SET DEFAULT 'GBP';

-- CreateTable
CREATE TABLE "worker_document" (
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

    CONSTRAINT "worker_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "worker_document_workerId_idx" ON "worker_document"("workerId");

-- CreateIndex
CREATE INDEX "worker_document_type_idx" ON "worker_document"("type");

-- CreateIndex
CREATE INDEX "worker_document_status_idx" ON "worker_document"("status");

-- CreateIndex
CREATE INDEX "worker_document_expiryDate_idx" ON "worker_document"("expiryDate");

-- CreateIndex
CREATE INDEX "worker_document_workerId_type_idx" ON "worker_document"("workerId", "type");

-- CreateIndex
CREATE INDEX "worker_document_workerId_status_idx" ON "worker_document"("workerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "worker_sessionToken_key" ON "worker"("sessionToken");

-- CreateIndex
CREATE INDEX "worker_sessionToken_idx" ON "worker"("sessionToken");

-- AddForeignKey
ALTER TABLE "worker_document" ADD CONSTRAINT "worker_document_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
