# Click ID Tracking Solution - Complete Implementation Guide

## Problem Identified

**Issue**: When visiting TTR funnel at `http://localhost:3001/?fbclid=IwAR1test123`, the click ID was not being stored in localStorage.

**Root Cause**: The Aurea Tracking SDK had click ID tracking code in the source, but TTR was using an older NPM package version (1.5.4) that didn't include the latest changes.

## Two Different Funnel Types

### 1. **Builder Funnels** (Built in Aurea CRM)

- **Location**: `src/features/funnel-builder/`
- **Deployment**: Pages rendered at `/f/[funnelId]/[slug]`
- **SDK Loading**: Via script tags injected in `tracking-scripts.ts`
- **Public SDK**: Served from `/public/aurea-tracking-sdk.js`
- **Status**: ✅ Fixed in previous session (added SDK to tracking scripts)

### 2. **Custom Funnels** (External Next.js Projects like TTR)

- **Location**: Separate projects (e.g., `~/Desktop/ttr`)
- **Deployment**: Independent Next.js apps (port 3001 for TTR)
- **SDK Loading**: NPM package `aurea-tracking-sdk` imported as dependency
- **Integration**: React component `<AureaTracking />` in layout
- **Status**: ✅ Fixed in this session (linked latest SDK build)

## Solution Implemented

### Step 1: Rebuild SDK with Click ID Tracking

```bash
cd /Users/abdul/Desktop/aurea-tracking-sdk
npm run build
```

**Output**:

- `dist/index.js` (CJS) - 47.20 KB
- `dist/index.mjs` (ESM) - 45.91 KB
- `dist/index.d.ts` (TypeScript types) - 11.87 KB

### Step 2: Link SDK to TTR Project

Instead of publishing to NPM, we used `npm link` for local development:

```bash
cd /Users/abdul/Desktop/ttr
npm link /Users/abdul/Desktop/aurea-tracking-sdk
```

This makes TTR use the local SDK build instead of the NPM registry version.

### Step 3: Verify SDK Code Has Click ID Tracking

**Location**: `/Users/abdul/Desktop/aurea-tracking-sdk/src/index.ts:1184-1234`

**How it works**:

1. On SDK initialization, `extractClickIds()` runs
2. Extracts `fbclid`, `gclid`, `ttclid`, `msclkid` from URL params
3. Calls `storeClickIds()` if any found
4. Stores in localStorage as `aurea_click_ids` with expiration
5. Includes click IDs in all subsequent tracking events

**Attribution Windows**:

- Facebook (`fbclid`): 28 days
- Google (`gclid`): 90 days
- TikTok (`ttclid`): 28 days
- Microsoft (`msclkid`): 30 days

**Storage Format**:

```json
{
  "fbclid": {
    "id": "IwAR1test123",
    "timestamp": 1735506000000,
    "expiresAt": 1737925200000
  }
}
```

## Current TTR Configuration

### Environment Variables (`/Users/abdul/Desktop/ttr/.env`)

```bash
NEXT_PUBLIC_AUREA_FUNNEL_ID=27c30cbc-661f-450a-a227-9cdcc662c366
NEXT_PUBLIC_AUREA_API_URL=http://localhost:3000/api
```

### SDK Integration (`/Users/abdul/Desktop/ttr/src/components/aurea-tracking.tsx`)

The component uses:

```typescript
import { initAurea } from "aurea-tracking-sdk"; // NPM package (now linked locally)

const sdk = initAurea({
  apiKey: process.env.NEXT_PUBLIC_AUREA_API_KEY,
  funnelId: process.env.NEXT_PUBLIC_AUREA_FUNNEL_ID,
  apiUrl: process.env.NEXT_PUBLIC_AUREA_API_URL || "http://localhost:3000/api",
  debug: true,
  autoTrack: {
    pageViews: true,
    forms: true,
    scrollDepth: true,
    clicks: false,
  },
  autoAdvanceStages: true,
});
```

### SDK Loaded in Layout (`/Users/abdul/Desktop/ttr/src/app/layout.tsx:4,79`)

```tsx
import { AureaTracking } from "@/components/aurea-tracking";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AureaTracking /> {/* Initializes SDK on mount */}
        {children}
      </body>
    </html>
  );
}
```

## Testing Instructions

### 1. Start Both Servers

**Terminal 1 - Aurea CRM Backend (port 3000)**:

```bash
cd /Users/abdul/Desktop/aurea-crm
npm dev:all
```

**Terminal 2 - TTR Funnel Frontend (port 3001)**:

```bash
cd /Users/abdul/Desktop/ttr
npm run dev
```

### 2. Test Click ID Tracking

**Visit URL with Click ID**:

```
http://localhost:3001/?fbclid=IwAR1test123
```

**Expected Console Output**:

```
[Aurea] Configuration: { hasApiKey: true, hasFunnelId: true, ... }
[Aurea] Initializing SDK...
[Aurea SDK] Click IDs extracted: { fbclid: 'IwAR1test123' }
[Aurea SDK] Stored click IDs: { fbclid: { id: 'IwAR1test123', timestamp: ..., expiresAt: ... } }
[Aurea] SDK initialized with custom event categories
```

**Check localStorage**:

1. Open DevTools → Application → Local Storage → `http://localhost:3001`
2. Look for key: `aurea_click_ids`
3. Value should be:

```json
{
  "fbclid": {
    "id": "IwAR1test123",
    "timestamp": 1735506789000,
    "expiresAt": 1737925989000
  }
}
```

**Check Session ID**:

1. Look for key: `aurea_session_id`
2. Should be a UUID: `ses_xxxxxxxxxxxxxxxxxxxxx`

### 3. Verify Click IDs Persist Across Navigation

**Navigate to different section** (scroll down on same page)
**Refresh the page**
**Visit URL without click ID**: `http://localhost:3001/`

**Expected**: `aurea_click_ids` should still be in localStorage until expiration (28 days for Facebook)

### 4. Verify Backend Receives Click IDs

**Check Database** (FunnelSession table):

```bash
cd /Users/abdul/Desktop/aurea-crm
npx prisma studio
```

Navigate to `FunnelSession` table and find the most recent session. Fields should be populated:

- `firstFbclid`: `"IwAR1test123"`
- `lastFbclid`: `"IwAR1test123"`
- `sessionId`: Matches localStorage `aurea_session_id`
- `funnelId`: `"27c30cbc-661f-450a-a227-9cdcc662c366"`

### 5. Test Multiple Click IDs

**Visit with Google Click ID**:

```
http://localhost:3001/?gclid=EAIaIQobChMI...
```

**Expected localStorage**:

```json
{
  "fbclid": {
    "id": "IwAR1test123",
    "timestamp": 1735506789000,
    "expiresAt": 1737925989000
  },
  "gclid": {
    "id": "EAIaIQobChMI...",
    "timestamp": 1735507000000,
    "expiresAt": 1743283000000
  }
}
```

**Database should show**:

- `firstGclid`: `"EAIaIQobChMI..."`
- `lastGclid`: `"EAIaIQobChMI..."`
- `firstFbclid`: `"IwAR1test123"` (preserved from earlier)
- `lastFbclid`: `"IwAR1test123"`

### 6. Test Click ID Expiration

**Manually edit localStorage**:

```javascript
// In browser console
const clickIds = JSON.parse(localStorage.getItem("aurea_click_ids"));
clickIds.fbclid.expiresAt = Date.now() - 1000; // Expired 1 second ago
localStorage.setItem("aurea_click_ids", JSON.stringify(clickIds));

// Refresh page
location.reload();
```

**Expected**: SDK should remove expired `fbclid` from storage and not include it in tracking events.

## Troubleshooting

### Issue: localStorage Not Being Created

**Check 1: Is SDK Loaded?**

```javascript
// In browser console
console.log(window.aureaSDK);
// Should show: { track, identify, checkoutStarted, ... }
```

**Check 2: Are Environment Variables Set?**

```javascript
// Add to aurea-tracking.tsx temporarily
console.log({
  apiKey: process.env.NEXT_PUBLIC_AUREA_API_KEY,
  funnelId: process.env.NEXT_PUBLIC_AUREA_FUNNEL_ID,
  apiUrl: process.env.NEXT_PUBLIC_AUREA_API_URL,
});
```

**Check 3: Is initAurea Running?**
Look for console logs:

- `[Aurea] Configuration: ...`
- `[Aurea] Initializing SDK...`

If missing, the `useEffect` in `aurea-tracking.tsx` isn't running.

**Check 4: Is Click ID in URL?**

```javascript
// In browser console
const params = new URLSearchParams(window.location.search);
console.log({
  fbclid: params.get("fbclid"),
  gclid: params.get("gclid"),
  ttclid: params.get("ttclid"),
});
```

### Issue: SDK Using Old Version

**Verify Link**:

```bash
cd /Users/abdul/Desktop/ttr
npm list aurea-tracking-sdk
# Should show: aurea-tracking-sdk@1.5.4
```

**Verify Link Target**:

```bash
ls -la /Users/abdul/Desktop/ttr/node_modules/aurea-tracking-sdk
# Should show: aurea-tracking-sdk -> ../../aurea-tracking-sdk
```

**Rebuild and Re-link**:

```bash
cd /Users/abdul/Desktop/aurea-tracking-sdk
npm run build

cd /Users/abdul/Desktop/ttr
npm link /Users/abdul/Desktop/aurea-tracking-sdk
npm run dev
```

### Issue: Click IDs Not Saving to Database

**Check API Endpoint**:

```javascript
// In browser console (Network tab)
// Look for POST requests to: http://localhost:3000/api/track/event

// Check request payload:
{
  "funnelId": "27c30cbc-661f-450a-a227-9cdcc662c366",
  "sessionId": "ses_xxxxx",
  "eventType": "page_view",
  "clickIds": {
    "fbclid": "IwAR1test123"
  }
}
```

**Check Backend Processing**:

```bash
# In Aurea CRM terminal, look for Inngest logs:
[Inngest] Function triggered: processTrackingEvent
[Inngest] Processing event: page_view
[Inngest] Click IDs: { fbclid: 'IwAR1test123' }
```

**Check Database Directly**:

```sql
-- In Prisma Studio or SQL console
SELECT
  "sessionId",
  "firstFbclid",
  "lastFbclid",
  "firstGclid",
  "lastGclid",
  "createdAt"
FROM "FunnelSession"
WHERE "funnelId" = '27c30cbc-661f-450a-a227-9cdcc662c366'
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Issue: TypeScript Errors in Aurea CRM

**Symptom**: Errors like:

```
Module '@prisma/client' has no exported member 'PixelProvider'
FunnelPage, FunnelBlock not exported from prisma client
Click ID fields not recognized
```

**Cause**: Prisma client cache is stale after schema changes.

**Fix**:

```bash
cd /Users/abdul/Desktop/aurea-crm
npx prisma generate
npm dev:all
```

## File Locations Reference

### Aurea CRM (Backend)

- **Click ID Migration**: `prisma/migrations/20251229180808_add_ad_platform_click_ids/`
- **Event Processing**: `src/inngest/functions/process-tracking-events.ts:126-144`
- **Conversion APIs**: `src/lib/ads/{meta,google,tiktok}/conversion-api.ts`
- **Analytics Router**: `src/features/analytics/server/ads-router.ts`
- **Builder Tracking Scripts**: `src/features/funnel-builder/lib/tracking-scripts.ts`
- **Public SDK**: `public/aurea-tracking-sdk.js`

### Aurea Tracking SDK (Standalone Package)

- **Source Code**: `/Users/abdul/Desktop/aurea-tracking-sdk/src/index.ts`
- **Click ID Tracking**: Lines 1184-1234 (extraction), 1856-1900 (storage)
- **Build Output**: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`
- **Package**: `package.json` (version 1.5.4)

### TTR Custom Funnel

- **Project Root**: `/Users/abdul/Desktop/ttr`
- **SDK Integration**: `src/components/aurea-tracking.tsx`
- **Layout**: `src/app/layout.tsx` (loads AureaTracking component)
- **Environment**: `.env` (API key, funnel ID, API URL)
- **Package**: `package.json` (links to local SDK)

## Production Deployment

### Option 1: Publish SDK to NPM (Recommended for Production)

```bash
cd /Users/abdul/Desktop/aurea-tracking-sdk

# Update version in package.json
npm version patch  # 1.5.4 -> 1.5.5

# Publish to NPM
npm publish

# Update TTR to use published version
cd /Users/abdul/Desktop/ttr
npm unlink aurea-tracking-sdk
npm install aurea-tracking-sdk@latest
npm run build
```

### Option 2: Keep Local Link (Development Only)

The current setup with `npm link` works for local development but won't deploy to production. Vercel/Netlify deployments need actual NPM packages.

### Option 3: Use Git Dependency (Alternative)

Update `package.json` in TTR:

```json
{
  "dependencies": {
    "aurea-tracking-sdk": "github:your-org/aurea-tracking-sdk#main"
  }
}
```

## Next Steps

### 1. **Immediate Testing** (Do Now)

- [ ] Start both servers (`aurea-crm` and `ttr`)
- [ ] Visit `http://localhost:3001/?fbclid=IwAR1test123`
- [ ] Check localStorage for `aurea_click_ids`
- [ ] Verify console shows SDK initialization logs
- [ ] Check Prisma Studio for `FunnelSession` entry with click IDs

### 2. **Verify Multi-Platform Tracking** (Next 10 Minutes)

- [ ] Test Google: `?gclid=EAIaIQobChMI...`
- [ ] Test TikTok: `?ttclid=E.C...`
- [ ] Test Microsoft: `?msclkid=...`
- [ ] Verify all click IDs stored in localStorage
- [ ] Verify database has all firstClickId/lastClickId fields populated

### 3. **Test Conversion Flow** (Next 30 Minutes)

- [ ] Visit funnel with `?fbclid=IwAR1test123`
- [ ] Click buy button → initiate checkout
- [ ] Complete purchase via Whop
- [ ] Verify conversion event includes click IDs
- [ ] Check if Meta Conversion API receives fbclid in `event_source_url`

### 4. **Real Ad Platform Testing** (When Ready)

**Prerequisites**:

- Funded ad accounts (Meta, Google, TikTok)
- Conversion API credentials configured in Aurea CRM
- Production domain with HTTPS

**Test Flow**:

1. Run real ad campaign with tracking parameters
2. Click ad → lands on TTR with click ID
3. Complete purchase
4. Verify conversion appears in ad platform (within 24 hours)
5. Check attribution (which click ID led to conversion)

See `AD_PLATFORM_TESTING_GUIDE.md` for detailed real ad testing instructions.

### 5. **Production Deployment Checklist**

- [ ] Publish SDK to NPM registry
- [ ] Update TTR `package.json` to use published version
- [ ] Set production env vars in Vercel/deployment platform:
  - `NEXT_PUBLIC_AUREA_API_KEY`
  - `NEXT_PUBLIC_AUREA_FUNNEL_ID`
  - `NEXT_PUBLIC_AUREA_API_URL` (production URL)
- [ ] Test on staging environment before production
- [ ] Monitor click ID tracking in production logs

## Key Differences: Builder Funnels vs Custom Funnels

| Feature           | Builder Funnels                         | Custom Funnels (TTR)                     |
| ----------------- | --------------------------------------- | ---------------------------------------- |
| **Location**      | Aurea CRM project                       | Separate Next.js projects                |
| **SDK Loading**   | Script tag injection                    | NPM package import                       |
| **SDK Source**    | `/public/aurea-tracking-sdk.js`         | `node_modules/aurea-tracking-sdk/dist/`  |
| **Configuration** | Auto-injected via `tracking-scripts.ts` | Manual in `aurea-tracking.tsx` component |
| **Deployment**    | Same server as CRM                      | Independent deployment                   |
| **Updates**       | Copy dist file to `/public`             | Update NPM package or re-link            |
| **Testing**       | Visit `/f/[funnelId]/[slug]`            | Visit custom domain (port 3001 locally)  |

## Important Notes

### Click ID Attribution Logic

**First Click Attribution**:

- `firstFbclid` = First time a user visits with fbclid
- Stored in localStorage and database
- **Never overwritten** - preserves original traffic source

**Last Click Attribution**:

- `lastFbclid` = Most recent visit with fbclid
- **Updated on every visit** with new click ID
- Shows which ad re-engaged the user before conversion

### Example Scenario:

1. **Day 1**: User clicks Facebook ad → `?fbclid=IwAR111`

   - `firstFbclid`: `IwAR111`
   - `lastFbclid`: `IwAR111`

2. **Day 3**: User clicks Google ad → `?gclid=EAIaIQ222`

   - `firstFbclid`: `IwAR111` (unchanged)
   - `lastFbclid`: `IwAR111` (unchanged - different platform)
   - `firstGclid`: `EAIaIQ222`
   - `lastGclid`: `EAIaIQ222`

3. **Day 5**: User clicks different Facebook ad → `?fbclid=IwAR333`

   - `firstFbclid`: `IwAR111` (unchanged - preserves first touch)
   - `lastFbclid`: `IwAR333` (updated - shows last touch)
   - `firstGclid`: `EAIaIQ222` (unchanged)
   - `lastGclid`: `EAIaIQ222` (unchanged)

4. **Day 7**: User converts (purchases)
   - Conversion API sends **both** first and last click IDs to ad platforms
   - Meta gets: `IwAR111` (first touch) and `IwAR333` (last touch)
   - Google gets: `EAIaIQ222` (only touch)
   - Platforms can attribute conversion based on their models

### Why Both First and Last Click?

**First Click** = Which ad introduced the user to the product (awareness)
**Last Click** = Which ad convinced them to buy (conversion)

Ad platforms use different attribution models:

- **Meta**: Defaults to 7-day click, 1-day view (last click wins)
- **Google**: Can use first click, last click, linear, time decay, position-based
- **TikTok**: Defaults to 7-day click, 1-day view (last click wins)

By storing both, you let the ad platform decide attribution while maintaining historical data.

## Summary

**Problem**: Click IDs weren't being tracked on TTR custom funnel.

**Root Cause**: TTR was using NPM package `aurea-tracking-sdk@1.5.4`, but the click ID tracking code was in the local source that hadn't been republished.

**Solution**:

1. Rebuilt SDK with click tracking (`npm run build`)
2. Linked local SDK to TTR (`npm link`)
3. SDK now extracts click IDs from URL and stores in localStorage
4. Backend processes click IDs from tracking events and saves to database
5. Conversion APIs send click IDs to ad platforms for attribution

**Status**: ✅ Ready for testing

**Next Action**: Start both servers and test with `?fbclid=IwAR1test123` URL parameter.

---

## Quick Commands Reference

```bash
# Start Aurea CRM Backend (Terminal 1)
cd /Users/abdul/Desktop/aurea-crm
npm dev:all

# Start TTR Funnel (Terminal 2)
cd /Users/abdul/Desktop/ttr
npm run dev

# Rebuild SDK (if source code changes)
cd /Users/abdul/Desktop/aurea-tracking-sdk
npm run build

# Re-link SDK to TTR (if rebuild needed)
cd /Users/abdul/Desktop/ttr
npm link /Users/abdul/Desktop/aurea-tracking-sdk

# Open Database Inspector
cd /Users/abdul/Desktop/aurea-crm
npx prisma studio

# Check SDK version in TTR
cd /Users/abdul/Desktop/ttr
npm list aurea-tracking-sdk

# Regenerate Prisma Client (if schema changes)
cd /Users/abdul/Desktop/aurea-crm
npx prisma generate
```

---

**Created**: Dec 29, 2025  
**Last Updated**: Dec 29, 2025  
**Status**: Implementation Complete - Ready for Testing
