-- AlterTable
ALTER TABLE "rota" ADD COLUMN     "actualEndTime" TIMESTAMP(3),
ADD COLUMN     "actualHours" DECIMAL(10,2),
ADD COLUMN     "actualStartTime" TIMESTAMP(3),
ADD COLUMN     "actualValue" DECIMAL(10,2),
ADD COLUMN     "scheduledHours" DECIMAL(10,2),
ADD COLUMN     "scheduledValue" DECIMAL(10,2);
