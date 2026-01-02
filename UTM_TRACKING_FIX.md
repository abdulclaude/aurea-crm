# UTM Tracking Fix - December 29, 2025

## Problem
UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`) were being correctly captured by the Aurea Tracking SDK and sent to the backend, but **session records** in the database showed `NULL` for `firstSource`, `firstMedium`, and `firstCampaign` fields.

## Root Cause
In `/src/inngest/functions/process-tracking-events.ts`, when updating an existing session, the `update:` block only updated `lastSource`, `lastMedium`, `lastCampaign` but **never updated** the `first*` fields.

This caused a problem when:
1. Session was created by an early event (e.g., `funnel_stage_entered`) that might not have UTM data
2. Later events (e.g., `page_view`) with UTM data would only update `last*` fields, leaving `first*` as NULL

## Evidence
- **Events table**: All events correctly had UTM data (`utmSource: 'discord'`, etc.)
- **Sessions table**: Sessions showed `firstSource: NULL` despite having events with UTM data
- **First event analysis**: The very first `page_view` event had UTM data, but the session created from it had NULL values

## Solution
Modified the session update logic in `process-tracking-events.ts`:

1. **Fetch existing session** to check if `firstSource` is NULL
2. **Conditionally update** `first*` fields only if:
   - It's a new session, OR
   - Existing session has NULL `firstSource`
3. **Never overwrite** existing non-NULL `first*` values

### Code Changes

```typescript
// Before: Only check if session exists
const isNewSession = !(await db.funnelSession.findUnique({
  where: { sessionId },
  select: { id: true },
}));

// After: Fetch session AND check first* fields
const existingSession = await db.funnelSession.findUnique({
  where: { sessionId },
  select: { 
    id: true,
    firstSource: true,
    firstMedium: true,
    firstCampaign: true,
    firstReferrer: true,
  },
});

const isNewSession = !existingSession;
const shouldUpdateFirst = isNewSession || !existingSession.firstSource;

// In update block:
...(shouldUpdateFirst && {
  firstSource: firstEvent.utmSource,
  firstMedium: firstEvent.utmMedium,
  firstCampaign: firstEvent.utmCampaign,
  firstReferrer: firstEvent.referrer,
}),
```

## Migration Script
Created `fix-session-utm.js` to backfill existing sessions:
- Found 11 sessions with NULL `firstSource`
- Fixed 2 sessions with UTM data from their first events
- 9 sessions remained as "Direct" (correctly, as they had no UTM data)

## Testing
1. ✅ SDK correctly extracts UTM from URL
2. ✅ SDK sends UTM in event context
3. ✅ Backend receives and stores UTM in events table
4. ✅ Sessions now get UTM data from first event
5. ⏳ Need to test: New sessions created going forward

## Files Modified
1. `/src/inngest/functions/process-tracking-events.ts` - Main fix
2. `/src/lib/aurea-tracking-sdk` (local dev) - Added debug logging
3. `fix-session-utm.js` - Migration script for existing data

## Debug Logging Added
- SDK: Logs when UTM params are extracted from URL
- SDK: Logs when sending page_view with UTM data
- Backend: Logs when creating/updating sessions with UTM values

## Next Steps
1. Test with a fresh session (clear cookies/storage)
2. Monitor Inngest logs to verify sessions are created correctly
3. Remove debug logging once confirmed working
4. Publish updated SDK if needed
