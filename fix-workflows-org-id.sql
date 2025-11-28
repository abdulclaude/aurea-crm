-- Fix existing workflows missing organizationId
-- This will set organizationId based on either:
-- 1. The subaccount's organization (if workflow has a subaccount), OR
-- 2. The user's active organization membership

-- Update workflows that have a subaccount - get org from subaccount
UPDATE "Workflows" w
SET "organizationId" = s."organizationId"
FROM "Subaccount" s
WHERE w."subaccountId" = s.id
  AND w."organizationId" IS NULL;

-- Update workflows without subaccount - get org from user's first organization membership
UPDATE "Workflows" w
SET "organizationId" = (
  SELECT om."organizationId"
  FROM "OrganizationMember" om
  WHERE om."userId" = w."userId"
  LIMIT 1
)
WHERE w."organizationId" IS NULL
  AND w."subaccountId" IS NULL;
