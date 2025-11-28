-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'IF_ELSE';
ALTER TYPE "NodeType" ADD VALUE 'SWITCH';
ALTER TYPE "NodeType" ADD VALUE 'LOOP';
ALTER TYPE "NodeType" ADD VALUE 'SET_VARIABLE';
ALTER TYPE "NodeType" ADD VALUE 'STOP_WORKFLOW';
