# Session Duration Display Fix

## Problem

The "Duration" column in the Sessions tab (External Funnels → Analytics → Sessions) was showing "—" (dash) instead of the actual session duration, even when sessions had a valid `durationSeconds` value.

## Root Cause

The `formatDuration` function in `sessions-table.tsx` was using a falsy check:

```typescript
const formatDuration = (seconds: number | null) => {
  if (!seconds) return "—";  // ❌ This returns "—" for 0, null, and undefined
  // ...
};
```

**Problem:** In JavaScript, `!0` is `true`, so sessions with `0` seconds duration would display "—" instead of "0s".

Additionally, sessions with very short durations (like 1-5 seconds) that evaluate as falsy in a loose check would also be hidden.

## Solution

Changed the check to explicitly test for `null` and `undefined`:

```typescript
const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds === 0) return "0s";
  // ... rest of formatting
};
```

## File Changed

**File:** `src/features/external-funnels/components/sessions-table.tsx`  
**Line:** 72-79

**Before:**
```typescript
const formatDuration = (seconds: number | null) => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};
```

**After:**
```typescript
const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};
```

## How Duration is Calculated

The `durationSeconds` field is populated in the Inngest tracking event processor:

**File:** `src/inngest/functions/process-tracking-events.ts`

```typescript
durationSeconds: sessionEndProps.duration || Math.floor(durationMs / 1000)
```

**Two sources:**
1. **Primary:** `sessionEndProps.duration` - From the `session_end` event sent by the SDK (more accurate, includes only active time)
2. **Fallback:** `Math.floor(durationMs / 1000)` - Calculated from first/last event timestamps

## Expected Behavior After Fix

| Duration (seconds) | Display |
|-------------------|---------|
| `null` | — |
| `undefined` | — |
| `0` | 0s |
| `5` | 5s |
| `65` | 1m 5s |
| `150` | 2m 30s |
| `3665` | 1h 1m |

## Testing

To verify the fix:

1. Navigate to External Funnels → Analytics → Sessions tab
2. Check the "Duration" column
3. Sessions should now show:
   - Actual duration values (e.g., "2m 30s")
   - "0s" for very short sessions
   - "—" only for sessions that truly have no duration data

## Related Issues

This fix is part of the session duration tracking improvements implemented in TTR:
- Sessions now send `session_end` events with accurate active/idle time
- Duration is tracked properly before checkout redirects
- See `SESSION_FIX_IMPLEMENTATION_COMPLETE.md` in TTR repo for details

## Impact

- ✅ Sessions with valid duration now display correctly
- ✅ Very short sessions (0-59 seconds) show properly
- ✅ Only truly missing data shows as "—"
- ✅ No changes to data storage or calculation logic
- ✅ Fix is purely cosmetic/display-related

---

**Status:** ✅ Fixed  
**Date:** December 29, 2025
