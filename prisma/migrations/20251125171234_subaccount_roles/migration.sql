/*
  Warnings:

  - The values [MEMBER] on the enum `SubaccountMemberRole` will be removed. If these variants are still used in the database, this will fail.
  - The `role` column on the `member` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('owner', 'admin', 'manager', 'staff', 'viewer');

-- AlterEnum
BEGIN;
CREATE TYPE "SubaccountMemberRole_new" AS ENUM ('AGENCY', 'ADMIN', 'MANAGER', 'STANDARD', 'LIMITED', 'VIEWER');
ALTER TABLE "public"."subaccount_member" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "subaccount_member" ALTER COLUMN "role" TYPE "SubaccountMemberRole_new" USING ("role"::text::"SubaccountMemberRole_new");
ALTER TYPE "SubaccountMemberRole" RENAME TO "SubaccountMemberRole_old";
ALTER TYPE "SubaccountMemberRole_new" RENAME TO "SubaccountMemberRole";
DROP TYPE "public"."SubaccountMemberRole_old";
ALTER TABLE "subaccount_member" ALTER COLUMN "role" SET DEFAULT 'STANDARD';
COMMIT;

-- AlterTable
ALTER TABLE "member" DROP COLUMN "role",
ADD COLUMN     "role" "OrganizationMemberRole" NOT NULL DEFAULT 'viewer';

-- AlterTable
ALTER TABLE "subaccount_member" ALTER COLUMN "role" SET DEFAULT 'STANDARD';
