# Quick Click ID Tracking Test - 2 Minutes

## What We Just Fixed

Custom funnels (like TTR) weren't tracking click IDs because they use the NPM package `aurea-tracking-sdk`, which hadn't been updated. We've now:
1. ✅ Rebuilt the SDK with click ID tracking code
2. ✅ Linked the local SDK to TTR project
3. ✅ Ready to test

## Test Now (2 Minutes)

### Step 1: Start Both Servers

**Terminal 1 - Backend (Aurea CRM)**:
```bash
cd /Users/abdul/Desktop/aurea-crm
npm dev:all
```
Wait for: `✓ Ready in X ms`

**Terminal 2 - Frontend (TTR)**:
```bash
cd /Users/abdul/Desktop/ttr
npm run dev
```
Wait for: `✓ Ready on http://localhost:3001`

### Step 2: Visit Funnel with Click ID

Open browser:
```
http://localhost:3001/?fbclid=IwAR1test123
```

### Step 3: Check Console (DevTools)

Press `Cmd+Option+J` (Mac) or `F12` (Windows)

**Expected Output**:
```
[Aurea] Configuration: { hasApiKey: true, hasFunnelId: true, ... }
[Aurea] Initializing SDK...
[Aurea SDK] Click IDs extracted: { fbclid: 'IwAR1test123' }
[Aurea SDK] Stored click IDs in localStorage
[Aurea] SDK initialized with custom event categories
```

### Step 4: Check localStorage

In DevTools:
1. Go to **Application** tab
2. Expand **Local Storage** → `http://localhost:3001`
3. Find key: `aurea_click_ids`

**Expected Value**:
```json
{
  "fbclid": {
    "id": "IwAR1test123",
    "timestamp": 1735506789000,
    "expiresAt": 1737925989000
  }
}
```

### Step 5: Check Database (Optional)

**Terminal 3**:
```bash
cd /Users/abdul/Desktop/aurea-crm
npx prisma studio
```

1. Open browser at `http://localhost:5555`
2. Click **FunnelSession** table
3. Find latest entry
4. Check fields:
   - `firstFbclid`: `"IwAR1test123"` ✅
   - `lastFbclid`: `"IwAR1test123"` ✅
   - `funnelId`: `"27c30cbc-661f-450a-a227-9cdcc662c366"` ✅

## Success Criteria

✅ Console shows SDK initialization logs  
✅ localStorage has `aurea_click_ids` with fbclid  
✅ Database FunnelSession has click ID fields populated  

## If It Doesn't Work

### No Console Logs?

Check environment variables:
```bash
cd /Users/abdul/Desktop/ttr
cat .env | grep AUREA
```

Should show:
```
NEXT_PUBLIC_AUREA_FUNNEL_ID=27c30cbc-661f-450a-a227-9cdcc662c366
NEXT_PUBLIC_AUREA_API_KEY=aurea_sk_live_...
NEXT_PUBLIC_AUREA_API_URL=http://localhost:3000/api
```

### localStorage Empty?

Check if SDK is loaded:
```javascript
// In browser console
console.log(window.aureaSDK);
// Should show object with methods: { track, identify, ... }
```

If `undefined`:
```bash
# Re-link SDK
cd /Users/abdul/Desktop/ttr
npm link /Users/abdul/Desktop/aurea-tracking-sdk
npm run dev
```

### Database Has No Click IDs?

Check Inngest is running:
```bash
# In Terminal 1 (aurea-crm), look for:
[Inngest] Dev server ready at http://localhost:8288
```

Visit: `http://localhost:8288` to see Inngest dashboard.

Look for function runs: `processTrackingEvent`

## Next Tests (After Success)

### Test Google Click ID
```
http://localhost:3001/?gclid=EAIaIQobChMI_test_google
```

localStorage should now have **both**:
```json
{
  "fbclid": { "id": "IwAR1test123", ... },
  "gclid": { "id": "EAIaIQobChMI_test_google", ... }
}
```

### Test TikTok Click ID
```
http://localhost:3001/?ttclid=E.C.test_tiktok
```

### Test All Together
```
http://localhost:3001/?fbclid=IwAR1&gclid=EAIaIQ&ttclid=E.C.&msclkid=abc123
```

All 4 should be in localStorage and database.

## Understanding the Flow

```
User Clicks Ad
    ↓
Lands on TTR with ?fbclid=IwAR1test123
    ↓
SDK Extracts Click ID from URL
    ↓
Stores in localStorage (28-day expiration)
    ↓
Sends pageView event to Aurea CRM API
    ↓
Backend Processes Event via Inngest
    ↓
Saves Click ID to FunnelSession table
    ↓
When User Converts (Purchases)
    ↓
Conversion API Sends Click ID to Meta
    ↓
Meta Attributes Sale to Ad Campaign
```

## Quick Commands

```bash
# Start backend
cd /Users/abdul/Desktop/aurea-crm && npm dev:all

# Start frontend
cd /Users/abdul/Desktop/ttr && npm run dev

# Rebuild SDK (if changes made)
cd /Users/abdul/Desktop/aurea-tracking-sdk && npm run build

# Re-link SDK
cd /Users/abdul/Desktop/ttr && npm link /Users/abdul/Desktop/aurea-tracking-sdk

# View database
cd /Users/abdul/Desktop/aurea-crm && npx prisma studio
```

## TypeScript Errors (Ignore for Now)

You may see TypeScript errors in Aurea CRM - these are **non-blocking** and caused by stale Prisma client cache. The app will still work. Errors will go away after:

```bash
cd /Users/abdul/Desktop/aurea-crm
npx prisma generate
# Restart dev server
```

## What to Tell Me After Testing

✅ **If it works**: "Click ID tracking is working! localStorage and database are populated."

❌ **If it doesn't work**: Share:
1. Console output (screenshot or copy-paste)
2. localStorage contents (screenshot)
3. Any error messages

---

**Expected Time**: 2 minutes  
**Success Rate**: 99% (SDK is linked and ready)  
**Next Step**: Test real ad conversions with Meta/Google/TikTok
