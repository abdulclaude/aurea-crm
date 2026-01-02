-- Delete all data from FunnelEvent, FunnelSession, AnonymousUserProfile, and FunnelWebVital tables
-- Execute in order to respect foreign key constraints

-- 1. Delete FunnelWebVital (has FK to FunnelSession)
DELETE FROM "FunnelWebVital";

-- 2. Delete FunnelEvent (independent, has FK to Funnel and Subaccount)
DELETE FROM "FunnelEvent";

-- 3. Delete FunnelSession (has FK to AnonymousUserProfile via profileId)
DELETE FROM "FunnelSession";

-- 4. Delete AnonymousUserProfile (no dependencies on other funnel tables)
DELETE FROM "anonymous_user_profiles";
