-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ONLINE', 'WORKING', 'DO_NOT_DISTURB', 'AWAY', 'OFFLINE');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "statusMessage" TEXT;
