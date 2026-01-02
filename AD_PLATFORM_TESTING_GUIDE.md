# Ad Platform Testing Guide - Low Budget Testing

**Goal**: Test conversion tracking and ROAS metrics with minimal spend  
**Budget**: $5-10 per platform (total $15-30)  
**Timeline**: 24-48 hours to see results

---

## 🎯 Testing Strategy

### Option 1: Micro Budget Test Campaigns (RECOMMENDED)
**Cost**: $5-10 per platform  
**Duration**: 1-3 days  
**Best for**: Real-world testing with actual conversions

### Option 2: Free Test Events (LIMITED)
**Cost**: $0  
**Duration**: Immediate  
**Best for**: Verifying technical setup only

---

## 💰 Option 1: Micro Budget Test Campaigns

### Meta (Facebook/Instagram) - $5-10

**Setup**:
1. Go to [Meta Ads Manager](https://business.facebook.com/adsmanager)
2. Create campaign:
   - **Objective**: Traffic or Conversions
   - **Daily Budget**: $5
   - **Duration**: 2 days
   
3. Ad Set:
   - **Audience**: Your local city/region (smaller = cheaper)
   - **Age**: 25-45 (broader for testing)
   - **Interests**: Generic (e.g., "Online Shopping")
   
4. Ad Creative:
   - **Type**: Single image or carousel
   - **Destination**: Your funnel URL
   - **Call-to-action**: "Shop Now" or "Learn More"

**Expected Results**:
- 50-200 clicks
- 1-5 conversions (if your funnel converts at 2-5%)
- Cost per click: $0.10-$0.30
- Cost per conversion: $2-$5

**Testing Your Implementation**:
```bash
# 1. User clicks your ad
# → Facebook adds ?fbclid=IwAR1xyz... to URL

# 2. Check if click ID captured:
# Prisma Studio → FunnelSession → filter by firstFbclid IS NOT NULL

# 3. User completes checkout
# → Server sends conversion to Meta CAPI

# 4. Verify in Meta Events Manager:
# Events → Your Pixel → Should see "Purchase" events with source "API" or "Both"

# 5. Check ROAS after 24h:
# Ads Manager → Campaigns → ROAS column
```

---

### Google Ads - $5-10

**Setup**:
1. Go to [Google Ads](https://ads.google.com/)
2. Create campaign:
   - **Goal**: Website traffic or Sales
   - **Campaign type**: Search
   - **Daily Budget**: $5
   - **Duration**: 2 days
   
3. Ad Group:
   - **Keywords**: 5-10 low-competition keywords (e.g., "[your city] [your product]")
   - **Match type**: Phrase match
   - **Max CPC**: $0.50
   
4. Ad:
   - **Headlines**: 3 variations
   - **Descriptions**: 2 variations
   - **Final URL**: Your funnel URL

**Expected Results**:
- 10-30 clicks
- 0-2 conversions
- Cost per click: $0.30-$1.00
- Cost per conversion: $5-10

**Testing Your Implementation**:
```bash
# 1. User clicks your ad
# → Google adds ?gclid=Cj0KCxyz... to URL

# 2. Check if click ID captured:
# Prisma Studio → FunnelSession → filter by firstGclid IS NOT NULL

# 3. User completes checkout
# → Server sends conversion to Google Ads API

# 4. Verify in Google Ads:
# Conversions → Conversion Actions → Should see conversions

# 5. Check ROAS after 24h:
# Campaigns → Conv. value/cost column
```

---

### TikTok Ads - $10-20 (Minimum $20/day)

**Setup**:
1. Go to [TikTok Ads Manager](https://ads.tiktok.com/)
2. Create campaign:
   - **Objective**: Traffic or Conversions
   - **Daily Budget**: $20 (TikTok minimum)
   - **Duration**: 1 day
   
3. Ad Group:
   - **Placements**: TikTok only (cheaper)
   - **Targeting**: Your country, 18-45
   - **Interests**: Broad
   
4. Ad:
   - **Video**: 9-15 seconds
   - **Text**: Short, catchy
   - **Landing page**: Your funnel URL

**Expected Results**:
- 100-300 clicks
- 2-10 conversions
- Cost per click: $0.10-$0.20
- Cost per conversion: $2-$5

**Testing Your Implementation**:
```bash
# 1. User clicks your ad
# → TikTok adds ?ttclid=7xyz... to URL

# 2. Check if click ID captured:
# Prisma Studio → FunnelSession → filter by firstTtclid IS NOT NULL

# 3. User completes checkout
# → Server sends conversion to TikTok Events API

# 4. Verify in TikTok Events Manager:
# Events → Web Events → Should see "CompletePayment" events

# 5. Check ROAS after 24h:
# Ads Manager → Campaigns → ROAS column
```

---

## 🆓 Option 2: Free Test Events (No Spend)

### Meta Test Events

**Setup**:
```bash
# 1. Get test event code from Meta Events Manager
# Settings → Test Events → Create Test Event Code

# 2. Add to .env:
META_TEST_EVENT_CODE=TEST12345

# 3. Modify conversion API call to include test code (already supported)
```

**Send Test Conversion**:
```typescript
// In your code or via Inngest UI:
await sendMetaPurchase(
  { 
    pixelId: process.env.META_PIXEL_ID!,
    accessToken: process.env.META_CAPI_ACCESS_TOKEN!,
    testEventCode: 'TEST12345' // Test mode
  },
  {
    eventId: 'test-event-001',
    email: 'test@example.com',
    value: 99.99,
    currency: 'USD',
    fbclid: 'IwAR1test123', // Fake click ID
  }
);
```

**Verify**:
- Meta Events Manager → Test Events tab
- Should see your test purchase event
- **Note**: Won't show in Ads Manager or affect ROAS

**Limitations**:
- ❌ No real click IDs (can't test full flow)
- ❌ No ad spend data
- ❌ No ROAS calculation
- ✅ Verifies API connection works
- ✅ Verifies data format is correct

---

### Google Ads Test Conversions

**Setup**:
```bash
# Google doesn't have a separate test mode
# Use a test conversion action instead

# 1. Create a test conversion action:
# Google Ads → Tools → Conversions → + New Conversion Action
# Name: "Test Purchase"
# Category: Purchase
# Value: Use different values for each conversion
```

**Send Test Conversion**:
```typescript
// Use your test conversion action ID
await sendGooglePurchase(
  {
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    conversionActionId: 'YOUR_TEST_ACTION_ID', // Test action
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    accessToken: process.env.GOOGLE_ADS_ACCESS_TOKEN!,
  },
  {
    gclid: 'test-gclid-123', // Fake click ID (will be rejected)
    email: 'test@example.com',
    value: 99.99,
    currency: 'USD',
  }
);
```

**Verify**:
- Google Ads → Conversions → Your test action
- **Note**: Will likely fail with "Invalid GCLID" error
- This is expected - proves API connection works

**Limitations**:
- ❌ Can't test without real gclid
- ❌ No ad spend data
- ❌ Google validates gclid authenticity

---

### TikTok Test Events

**Setup**:
```bash
# TikTok has a test event code similar to Meta

# 1. Get test event code from TikTok Events Manager
# Assets → Events → Web Events → Test Events

# 2. Add to conversion API call (parameter supported)
```

**Send Test Conversion**:
```typescript
await sendTikTokPurchase(
  { 
    pixelCode: process.env.TIKTOK_PIXEL_ID!,
    accessToken: process.env.TIKTOK_ACCESS_TOKEN!,
    testEventCode: 'TEST12345' // Test mode
  },
  {
    eventId: 'test-event-001',
    email: 'test@example.com',
    value: 99.99,
    currency: 'USD',
    ttclid: '7test123', // Fake click ID
  }
);
```

**Verify**:
- TikTok Events Manager → Test Events tab
- Should see your test purchase event

**Limitations**:
- Same as Meta (can test API, not full flow)

---

## 🧪 Best Testing Approach (RECOMMENDED)

### Phase 1: Free API Testing (Day 0)
**Cost**: $0  
**Goal**: Verify APIs are working

```bash
# 1. Send test events to Meta and TikTok using test codes
# 2. Verify events appear in test dashboards
# 3. Fix any API errors
```

### Phase 2: Micro Campaign Testing (Days 1-3)
**Cost**: $15-30 total  
**Goal**: Test full conversion flow with real data

```bash
# 1. Run $5 Meta campaign targeting your local area
# 2. Run $5 Google Search campaign with cheap keywords
# 3. Run $20 TikTok campaign (if budget allows)

# 4. Monitor for 48 hours:
# - Check click IDs are captured
# - Check conversions are sent
# - Check ad spend syncs daily
# - Calculate ROAS manually to verify math
```

### Phase 3: Analysis (Day 4)
**Cost**: $0  
**Goal**: Verify all metrics are accurate

```bash
# 1. Compare your database ROAS vs platform ROAS
# 2. Verify conversion counts match
# 3. Check spend amounts match
# 4. Test dashboard UI with real data
```

---

## 📊 Expected Costs Breakdown

### Minimal Testing ($15)
- Meta: $5 (2-day campaign)
- Google: $5 (2-day campaign)
- TikTok: Skip (too expensive for testing)
- **Total**: $10 + fees

### Standard Testing ($30)
- Meta: $10 (3-day campaign)
- Google: $10 (3-day campaign)
- TikTok: $20 (1-day campaign)
- **Total**: $40 + fees

### Thorough Testing ($100)
- Meta: $30 (7-day campaign, multiple ad sets)
- Google: $30 (7-day campaign, multiple keywords)
- TikTok: $40 (2-day campaign)
- **Total**: $100 + fees
- **Benefit**: Enough data to properly test analytics dashboard

---

## ✅ Testing Checklist

### Before Running Ads
- [ ] Add all environment variables
- [ ] Restart dev server
- [ ] Test Meta CAPI with test event code
- [ ] Test TikTok Events API with test event code
- [ ] Verify Prisma Studio can see FunnelSession table
- [ ] Verify Inngest function is registered (`npm inngest:dev`)

### During Campaign
- [ ] Monitor Inngest logs for conversion events
- [ ] Check Prisma Studio for click IDs in FunnelSession
- [ ] Verify conversions appear in platform dashboards
- [ ] Take screenshots of platform ROAS for comparison

### After Campaign
- [ ] Wait for 2 AM cron job to sync ad spend
- [ ] Verify AdSpend table has data
- [ ] Compare calculated ROAS with platform ROAS
- [ ] Check all analytics dashboard metrics
- [ ] Document any discrepancies

---

## 🐛 Troubleshooting

### Click IDs Not Captured
```bash
# Check SDK is loaded:
# View page source → Search for "aurea-tracking"

# Check localStorage:
# Browser DevTools → Application → Local Storage
# Should see: aurea_click_ids

# Check events are sent:
# Inngest UI → processTrackingEvents → View runs
```

### Conversions Not Sent
```bash
# Check Inngest logs:
# Look for "[Ad Conversions] Sent Meta purchase..."

# Check environment variables:
echo $META_PIXEL_ID
echo $META_CAPI_ACCESS_TOKEN

# Check session has click ID:
# Prisma Studio → FunnelSession → Find your session
# Verify lastFbclid is not null
```

### Ad Spend Not Syncing
```bash
# Manually trigger sync:
# Inngest UI → syncAdSpend → Invoke

# Check credentials:
# AdPlatformCredential table should have active credentials
# OR check environment variables are set

# Check Inngest logs for errors
```

### ROAS Doesn't Match Platform
```sql
-- Calculate manually:
SELECT 
  platform,
  SUM(spend) as total_spend,
  SUM(revenue) as total_revenue,
  (SUM(revenue) / SUM(spend) * 100) as calculated_roas,
  AVG(roas) as avg_stored_roas
FROM "AdSpend"
WHERE date >= '2024-12-01'
GROUP BY platform;

-- Compare with platform dashboards
```

---

## 💡 Pro Tips

### 1. Use UTM Parameters Too
```
https://yourfunnel.com/?fbclid=xxx&utm_source=facebook&utm_medium=cpc&utm_campaign=test-campaign
```
This helps you track campaigns even if click IDs fail.

### 2. Target Yourself
- Use age/location targeting to show ads only to yourself
- Cheaper, faster testing
- More control over when conversions happen

### 3. Use Conversion-Optimized Funnels
If you're testing conversions, use a funnel you know converts well (or create a dummy checkout that always succeeds).

### 4. Test During Off-Peak Hours
Cheaper CPCs at night and weekends in most regions.

### 5. Start with Meta Only
Facebook has the cheapest clicks and best test event tools. Get that working first, then add Google and TikTok.

---

## 🎯 Recommended Testing Plan

### Day 0 (Today)
- [ ] Set up Meta test events
- [ ] Set up TikTok test events
- [ ] Send 5-10 test conversions
- [ ] Verify they appear in platform test dashboards
- [ ] Fix any API errors

### Day 1-2 (Tomorrow)
- [ ] Launch $5 Meta campaign targeting your city
- [ ] Launch $5 Google Search campaign with cheap keywords
- [ ] Monitor click IDs being captured
- [ ] Click on your own ads if needed (1-2 clicks max to avoid issues)

### Day 3 (48 hours later)
- [ ] Check if conversions were sent to platforms
- [ ] Verify ad spend synced via 2 AM cron job
- [ ] Compare database ROAS with platform ROAS
- [ ] Test analytics dashboard with real data
- [ ] Document any bugs or discrepancies

### Day 4 (Analysis)
- [ ] Turn off campaigns
- [ ] Calculate total spend vs total revenue
- [ ] Verify all metrics are accurate
- [ ] Screenshot everything for documentation

---

## 📝 Testing Data Example

Here's what you should see after a $10 Meta test campaign:

**In Your Database** (Prisma Studio):
```
FunnelSession:
  - sessionId: ses_abc123
  - firstFbclid: IwAR1xyz...
  - lastFbclid: IwAR1xyz...
  - fbp: fb.1.1234567890.abcdef
  - converted: true
  - conversionValue: 99.99
  - conversionPlatform: "facebook"

AdSpend:
  - platform: "facebook"
  - campaignId: "23851234567890"
  - date: 2024-12-30
  - spend: 10.42
  - impressions: 1243
  - clicks: 87
  - conversions: 3
  - revenue: 299.97
  - roas: 2878.5 (287.85%)
```

**In Meta Ads Manager**:
- Spend: $10.42
- Impressions: 1,243
- Clicks: 87
- Purchases: 3
- Revenue: $299.97
- ROAS: 28.79x (2879%)

**In Meta Events Manager**:
- Source: "API" or "Website and API (Both)"
- Event Name: Purchase
- Count: 3
- Total Value: $299.97

---

## ✅ Success Criteria

Your implementation is working correctly when:

1. ✅ Click IDs appear in `FunnelSession` table
2. ✅ Conversions sent to platforms (check Inngest logs)
3. ✅ Conversions visible in platform dashboards
4. ✅ Ad spend syncs daily at 2 AM
5. ✅ Database ROAS matches platform ROAS (±5% tolerance)
6. ✅ Analytics dashboard displays correct metrics

---

**Bottom Line**: Start with free test events today, then run a $10-15 micro campaign tomorrow. You'll have real data to test your analytics dashboard within 48 hours! 🚀
