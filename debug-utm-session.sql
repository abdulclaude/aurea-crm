-- Check the most recent sessions for this funnel
SELECT 
  sessionId,
  firstSource,
  firstMedium,
  firstCampaign,
  firstReferrer,
  firstPageUrl,
  startedAt,
  anonymousId
FROM "FunnelSession"
WHERE funnelId = '27c30cbc-661f-450a-a227-9cdcc662c366'
ORDER BY startedAt DESC
LIMIT 5;

-- Check the most recent events for this funnel
SELECT 
  eventId,
  eventName,
  sessionId,
  utmSource,
  utmMedium,
  utmCampaign,
  referrer,
  pageUrl,
  timestamp
FROM "FunnelEvent"
WHERE funnelId = '27c30cbc-661f-450a-a227-9cdcc662c366'
ORDER BY timestamp DESC
LIMIT 10;
