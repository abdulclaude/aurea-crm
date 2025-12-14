-- AlterTable
ALTER TABLE "time_log" ADD COLUMN     "descriptionMode" TEXT DEFAULT 'single',
ADD COLUMN     "sections" JSONB;
