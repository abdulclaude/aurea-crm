-- AlterTable
ALTER TABLE "Workflows" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;
