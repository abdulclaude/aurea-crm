# Free Test Events - Step-by-Step Walkthrough

**Goal**: Test click ID tracking and conversion API without spending money  
**Time**: 15-20 minutes  
**Cost**: $0

---

## Prerequisites

✅ Dev server running: `npm dev:all`  
✅ Inngest dev server running (should start with npm dev:all)  
✅ You have a funnel created in Aurea CRM

---

## Part 1: Setup Meta Test Events (5 min)

### Step 1: Get Meta Test Event Code

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Select your pixel (or create one if you don't have it)
3. Click **Settings** in left sidebar
4. Scroll down to **Test Events**
5. Click **Test Events** tab
6. Click **Create Test Event Code**
7. Copy the code (looks like: `TEST12345`)

### Step 2: Add to Environment Variables

```bash
# Add to /Users/abdul/Desktop/aurea-crm/.env
META_PIXEL_ID=your_pixel_id_here
META_CAPI_ACCESS_TOKEN=your_access_token_here
META_TEST_EVENT_CODE=TEST12345  # ← Add this line
```

**Where to get credentials:**
- **Pixel ID**: Events Manager → Settings → Pixel ID
- **Access Token**: Events Manager → Settings → Conversions API → Generate Access Token

### Step 3: Restart Server (If Running)

```bash
# Kill and restart to load new env vars
npm dev:all
```

---

## Part 2: Test Click ID Tracking (5 min)

### Step 1: Get Your Funnel Domain

1. Go to http://localhost:3000
2. Navigate to **Funnels** (or External Funnels)
3. Select or create a funnel
4. Note the funnel domain (e.g., `localhost:3001` or custom domain)
5. Note the funnel ID from URL (e.g., `/funnels/cm5abc123...`)

**Example funnel URL structure:**
```
http://localhost:3001  (if using default tracking subdomain)
OR
http://your-custom-domain.com  (if you set up a custom domain)
```

### Step 2: Visit Funnel with Click IDs

Open these URLs in your browser (replace `localhost:3001` with your funnel domain):

**Meta/Facebook Test:**
```
http://localhost:3001/?fbclid=IwAR1test123&utm_source=facebook&utm_medium=cpc&utm_campaign=test
```

**Google Ads Test:**
```
http://localhost:3001/?gclid=Cj0KCtest456&utm_source=google&utm_medium=cpc&utm_campaign=test
```

**TikTok Test:**
```
http://localhost:3001/?ttclid=7test789&utm_source=tiktok&utm_medium=paid&utm_campaign=test
```

### Step 3: Verify Click IDs Were Captured

**Method 1: Check LocalStorage** (Easiest)
1. On the funnel page, open DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab → **Local Storage**
3. Look for `aurea_click_ids`
4. You should see:
```json
{
  "fbclid": "IwAR1test123",
  "expires": 1234567890000
}
```

**Method 2: Check Database** (Most Reliable)
```bash
# Open Prisma Studio
npx prisma studio

# Navigate to FunnelSession table
# Find your session (most recent)
# Check these fields:
# - firstFbclid: "IwAR1test123"
# - lastFbclid: "IwAR1test123"
# - conversionPlatform: "facebook"
```

---

## Part 3: Send Test Conversion Events (5 min)

### Option A: Via Inngest Dev Server UI (Recommended)

1. Open Inngest Dev Server: http://localhost:8288
2. Go to **Functions** tab
3. Find `send-ad-platform-conversions` or `process-tracking-events`
4. Click **Invoke** button
5. Use this test payload:

```json
{
  "events": [
    {
      "eventId": "test-event-001",
      "eventName": "checkout_completed",
      "sessionId": "YOUR_SESSION_ID_FROM_PRISMA_STUDIO",
      "timestamp": "2024-12-29T20:00:00Z",
      "revenue": 99.99,
      "eventProperties": {
        "email": "test@example.com",
        "phone": "+14155551234",
        "currency": "USD",
        "orderId": "test-order-123"
      },
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0 Test"
    }
  ]
}
```

**To get YOUR_SESSION_ID:**
- Open Prisma Studio: `npx prisma studio`
- Go to **FunnelSession** table
- Find the session with your test click ID
- Copy the `sessionId` field (looks like: `ses_abc123...`)

### Option B: Via Direct API Call

Create a test file:

```typescript
// /Users/abdul/Desktop/aurea-crm/test-conversion.ts

import { sendMetaPurchase } from "./src/lib/ads/meta/conversion-api";

async function testMetaConversion() {
  const result = await sendMetaPurchase(
    {
      pixelId: process.env.META_PIXEL_ID!,
      accessToken: process.env.META_CAPI_ACCESS_TOKEN!,
      testEventCode: process.env.META_TEST_EVENT_CODE, // Uses test mode
    },
    {
      eventId: "test-event-001",
      email: "test@example.com",
      phone: "+14155551234",
      value: 99.99,
      currency: "USD",
      orderId: "test-order-123",
      fbclid: "IwAR1test123",
      fbp: "_fbp.123.456",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test",
      eventTime: Math.floor(Date.now() / 1000),
    }
  );

  console.log("Result:", result);
}

testMetaConversion();
```

Run it:
```bash
npx tsx test-conversion.ts
```

---

## Part 4: Verify Test Events (5 min)

### Meta Events Manager

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Select your pixel
3. Click **Test Events** tab
4. You should see your test purchase event:
   - Event Name: `Purchase`
   - Event Time: Just now
   - Value: $99.99
   - Source: `Server` or `Both` (if pixel also fired)
   - Test Event Code: `TEST12345`

### Check Inngest Logs

1. Go to http://localhost:8288
2. Click **Runs** tab
3. Find recent `process-tracking-events` run
4. Look for log: `[Ad Conversions] Sent Meta purchase for event test-event-001`

### Check Database

```bash
# Open Prisma Studio
npx prisma studio

# Check FunnelSession table
# Find your session
# Verify:
# - converted: true
# - conversionValue: 99.99
# - lastFbclid: "IwAR1test123"
```

---

## Part 5: Test the Dashboard (2 min)

### Navigate to Ads Analytics

1. Go to http://localhost:3000
2. Navigate to **Funnels** → Your funnel
3. Click **Analytics** tab in left sidebar
4. Click **Ad Performance** (or navigate to `/analytics/ads`)

### What You Should See

**Before ad spend syncs:**
- Summary cards show $0
- Platform table shows "No ad spend data available"
- This is normal! Test events don't create ad spend records

**To see dashboard with data:**
You need to either:
1. Manually insert test AdSpend records (see Part 6)
2. Run a real micro campaign ($5-10)

---

## Part 6: Add Test Ad Spend Data (Optional)

If you want to see the dashboard populated with test data:

```sql
-- Run this in Prisma Studio or psql

-- Get your organization ID and funnel ID first
SELECT id FROM "Organization" LIMIT 1;
SELECT id, "subaccountId" FROM "Funnel" LIMIT 1;

-- Insert test ad spend (replace IDs with yours)
INSERT INTO "AdSpend" (
  id, 
  "organizationId", 
  "subaccountId", 
  "funnelId",
  platform, 
  "campaignId",
  "campaignName",
  date, 
  spend, 
  currency, 
  impressions, 
  clicks, 
  conversions, 
  revenue,
  cpc, cpm, ctr, "conversionRate", roas,
  "createdAt",
  "updatedAt"
) VALUES 
(
  'test-meta-spend-1',
  'YOUR_ORG_ID',  -- Replace
  'YOUR_SUBACCOUNT_ID',  -- Replace or NULL
  'YOUR_FUNNEL_ID',  -- Replace
  'facebook',
  '23851234567890',
  'Test Meta Campaign',
  '2024-12-29',
  10.50,
  'USD',
  1250,
  95,
  3,
  299.97,
  0.11,
  8.40,
  7.60,
  3.16,
  2854.00,
  NOW(),
  NOW()
),
(
  'test-google-spend-1',
  'YOUR_ORG_ID',  -- Replace
  'YOUR_SUBACCOUNT_ID',  -- Replace or NULL
  'YOUR_FUNNEL_ID',  -- Replace
  'google',
  '98765432109',
  'Test Google Campaign',
  '2024-12-29',
  8.25,
  'USD',
  850,
  42,
  2,
  199.98,
  0.20,
  9.71,
  4.94,
  4.76,
  2423.00,
  NOW(),
  NOW()
);
```

**Then refresh the dashboard:**
- Summary should show ~$18.75 spend, ~$500 revenue
- ROAS should be ~2600% (excellent!)
- Platform table should show Meta and Google rows

---

## Troubleshooting

### Click IDs Not Appearing

**Check 1: SDK Loaded?**
```bash
# View page source of your funnel
# Search for: aurea-tracking
# Should see: <script src="...aurea-tracking-sdk..."></script>
```

**Check 2: Events Being Sent?**
```bash
# Inngest UI: http://localhost:8288
# Functions → process-tracking-events → Recent runs
# Should see pageview events
```

**Check 3: LocalStorage?**
```javascript
// Browser console on funnel page
localStorage.getItem('aurea_click_ids')
// Should return: {"fbclid":"IwAR1test123","expires":...}
```

### Conversions Not Sending

**Check 1: Environment Variables**
```bash
# Check .env has:
META_PIXEL_ID=...
META_CAPI_ACCESS_TOKEN=...
META_TEST_EVENT_CODE=...

# Restart server after adding
```

**Check 2: Inngest Logs**
```bash
# http://localhost:8288
# Runs tab → process-tracking-events
# Look for errors in step: "send-ad-platform-conversions"
```

**Check 3: Session Has Click ID?**
```bash
# Prisma Studio → FunnelSession
# Find your session
# Verify lastFbclid is NOT NULL
```

### Test Event Not in Meta Dashboard

**Check 1: Test Event Code**
```bash
# .env file:
META_TEST_EVENT_CODE=TEST12345  # Must match Meta Events Manager
```

**Check 2: Pixel ID Correct?**
```bash
# Meta Events Manager → Settings
# Copy exact Pixel ID (no spaces)
```

**Check 3: Access Token Valid?**
```bash
# Test with curl:
curl -X POST "https://graph.facebook.com/v18.0/YOUR_PIXEL_ID/events?access_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":[{"event_name":"PageView","event_time":1234567890}]}'

# Should return: {"events_received":1}
```

---

## Success Checklist

- [ ] Visited funnel with `?fbclid=IwAR1test123`
- [ ] Click ID appeared in localStorage
- [ ] Click ID saved to FunnelSession table
- [ ] Sent test conversion event via Inngest or API
- [ ] Test event appeared in Meta Events Manager
- [ ] Inngest log shows "Sent Meta purchase"
- [ ] FunnelSession marked as converted
- [ ] Dashboard loads without errors
- [ ] (Optional) Inserted test AdSpend data
- [ ] (Optional) Dashboard shows test metrics

---

## Next Steps

### You're Ready For Real Testing!

Once free test events work:

1. **Run a $5 Meta Campaign** (see `AD_PLATFORM_TESTING_GUIDE.md`)
2. **Wait 48 hours** for conversions and ad spend
3. **Check dashboard** to see real metrics
4. **Compare dashboard ROAS** with Meta Ads Manager ROAS
5. **Celebrate!** 🎉

---

## Quick Reference: Test URLs

```bash
# Meta
http://localhost:3001/?fbclid=IwAR1test123&utm_source=facebook&utm_medium=cpc

# Google
http://localhost:3001/?gclid=Cj0KCtest456&utm_source=google&utm_medium=cpc

# TikTok
http://localhost:3001/?ttclid=7test789&utm_source=tiktok&utm_medium=paid

# All platforms (multi-touch test)
http://localhost:3001/?fbclid=IwAR1test123&gclid=Cj0KCtest456&ttclid=7test789&utm_source=test&utm_medium=multi
```

---

## Important Notes

1. **Test events don't create ad spend records** - you need to manually insert them or run real campaigns
2. **Test event code prevents events from affecting real ad account metrics** - this is good!
3. **Click IDs expire after 28-90 days** (platform-specific) - old click IDs won't send conversions
4. **Event deduplication uses eventId** - use unique IDs for each test

---

**You're all set! Start with Part 1 and work through each part.** 🚀

**Estimated time: 15-20 minutes total**
