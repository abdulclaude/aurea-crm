-- Fix existing workflows missing organizationId
-- This will set organizationId based on either:
-- 1. The location's organization (if workflow has a location), OR
-- 2. The user's active organization membership

-- Update workflows that have a location - get org from location
UPDATE "Workflows" w
SET "organizationId" = s."organizationId"
FROM "Location" s
WHERE w."locationId" = s.id
  AND w."organizationId" IS NULL;

-- Update workflows without location - get org from user's first organization membership
UPDATE "Workflows" w
SET "organizationId" = (
  SELECT om."organizationId"
  FROM "OrganizationMember" om
  WHERE om."userId" = w."userId"
  LIMIT 1
)
WHERE w."organizationId" IS NULL
  AND w."locationId" IS NULL;
