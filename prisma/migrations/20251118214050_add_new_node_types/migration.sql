-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'WAIT';
ALTER TYPE "NodeType" ADD VALUE 'CREATE_CONTACT';
ALTER TYPE "NodeType" ADD VALUE 'UPDATE_CONTACT';
ALTER TYPE "NodeType" ADD VALUE 'DELETE_CONTACT';
ALTER TYPE "NodeType" ADD VALUE 'CREATE_DEAL';
ALTER TYPE "NodeType" ADD VALUE 'UPDATE_DEAL';
ALTER TYPE "NodeType" ADD VALUE 'DELETE_DEAL';
ALTER TYPE "NodeType" ADD VALUE 'UPDATE_PIPELINE';
