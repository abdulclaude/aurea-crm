DO $$
DECLARE
  duplicate_group_count bigint;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_group_count
  FROM (
    SELECT
      "organizationId",
      "locationId",
      provider,
      "externalAccountId"
    FROM "ProviderAccount"
    WHERE
      "externalAccountId" IS NOT NULL
      AND provider IN ('GOOGLE_WORKSPACE', 'MICROSOFT_365', 'SLACK_OAUTH', 'DISCORD_OAUTH')
    GROUP BY "organizationId", "locationId", provider, "externalAccountId"
    HAVING COUNT(*) > 1
  ) duplicate_groups;

  IF duplicate_group_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = format(
        'Cannot enforce scoped OAuth identity uniqueness: %s duplicate exact-scope group(s) require operator reconciliation.',
        duplicate_group_count
      );
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderAccount_org_oauth_identity_key"
ON "ProviderAccount" USING btree ("organizationId", "provider", "externalAccountId")
WHERE "locationId" IS NULL
  AND "externalAccountId" IS NOT NULL
  AND "provider" IN ('GOOGLE_WORKSPACE', 'MICROSOFT_365', 'SLACK_OAUTH', 'DISCORD_OAUTH');
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderAccount_location_oauth_identity_key"
ON "ProviderAccount" USING btree ("organizationId", "locationId", "provider", "externalAccountId")
WHERE "locationId" IS NOT NULL
  AND "externalAccountId" IS NOT NULL
  AND "provider" IN ('GOOGLE_WORKSPACE', 'MICROSOFT_365', 'SLACK_OAUTH', 'DISCORD_OAUTH');
