/*
  Warnings:

  - You are about to drop the column `latitude` on the `FunnelEvent` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `FunnelEvent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FunnelEvent" DROP COLUMN "latitude",
DROP COLUMN "longitude";

-- AlterTable
ALTER TABLE "FunnelSession" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
