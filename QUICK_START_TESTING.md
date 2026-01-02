# Quick Start - Testing Ad Platform Integration

**Updated**: December 29, 2024  
**Time to Test**: 5 minutes  
**Cost**: Free

---

## ✅ Sidebar Navigation Added!

The "Ad Performance" link is now in your Analytics sidebar under **"Sources & Attribution"** group.

### How to Access:

1. Go to **Funnels** → Select a funnel
2. Click **Analytics** in the sidebar
3. In the analytics sidebar, expand **"Sources & Attribution"**
4. Click **"Ad Performance"** 💰

**Direct URL:**
```
http://localhost:3000/funnels/{your-funnel-id}/analytics/ads
```

---

## 🚀 Quick Test (5 Minutes)

### Step 1: Visit Funnel with Test Click ID

Open this URL in your browser:

```
http://localhost:3001/?fbclid=IwAR1test123&utm_source=facebook&utm_medium=cpc&utm_campaign=test
```

**Note**: Replace `localhost:3001` with your actual funnel domain.

### Step 2: Verify Click ID Captured

Press **F12** → **Application** tab → **Local Storage** → Check for `aurea_click_ids`

You should see:
```json
{
  "fbclid": "IwAR1test123",
  "expires": 1234567890000
}
```

### Step 3: Check Dashboard

Navigate to:
```
Funnels → Your Funnel → Analytics → Ad Performance
```

You should see:
- ✅ Summary cards (showing $0 - normal without ad spend)
- ✅ Empty platform table with message: "No ad spend data available"
- ✅ Empty chart
- ✅ No errors

**This means it's working!** 🎉

---

## 📊 What You'll See

### Before Running Ads:
- **Summary**: All $0 (expected)
- **Platform Table**: "No ad spend data available"
- **Chart**: Empty
- **Status**: ✅ Working correctly!

### After Running $5-10 Test Campaign (48h):
- **Summary**: Real spend, revenue, ROAS
- **Platform Table**: Meta/Google/TikTok rows with metrics
- **Chart**: ROAS over time
- **Campaigns**: Top performing campaigns
- **Attribution**: First-touch vs last-touch breakdown

---

## 🎯 Next Steps

### To See Real Data:

**Option 1: Insert Test Data** (Immediate - for UI testing)
```sql
-- See FREE_TEST_EVENTS_WALKTHROUGH.md Part 6
-- Manually insert AdSpend records for testing
```

**Option 2: Run Micro Campaign** (Recommended - real testing)
```bash
# Meta: $5 for 2 days
# See AD_PLATFORM_TESTING_GUIDE.md
# Wait 48 hours for data to appear
```

---

## 🔍 File Locations

### Backend:
- Router: `src/features/analytics/server/ads-router.ts`
- APIs: `src/lib/ads/{meta,google,tiktok}/`
- Sync: `src/inngest/functions/sync-ad-spend.ts`

### Frontend:
- Page: `src/app/(dashboard)/funnels/[funnelId]/analytics/ads/page.tsx`
- Component: `src/features/analytics/components/ads-analytics.tsx`
- Sidebar: `src/features/external-funnels/components/analytics-sidebar.tsx` ← **Updated!**

---

## ⚠️ Known Issues

### TypeScript Errors
All TypeScript errors are cache-related. **Fix**:
```bash
npm dev:all
```
(Restart dev server to clear cache)

### Dashboard Empty
This is **normal** without ad spend data! Run a campaign or insert test data.

---

## 📚 Full Documentation

- **Testing Guide**: `AD_PLATFORM_TESTING_GUIDE.md` (comprehensive)
- **Free Test Events**: `FREE_TEST_EVENTS_WALKTHROUGH.md` (step-by-step)
- **Quick Start**: `AD_PLATFORM_QUICK_START.md` (5-minute setup)
- **Phase 2 & 3 Complete**: `SESSION_SUMMARY_PHASE_2_AND_3_COMPLETE.md` (full summary)

---

## ✨ What's Complete

- ✅ Click ID tracking (Meta, Google, TikTok)
- ✅ Server-side conversion APIs
- ✅ Event processing integration
- ✅ Ad spend sync (daily at 2 AM)
- ✅ ROAS calculations
- ✅ Analytics dashboard UI
- ✅ Sidebar navigation ← **NEW!**

---

**You're all set! Navigate to Ad Performance in your analytics sidebar now!** 🚀

**Location**: Funnels → {Funnel} → Analytics → Sources & Attribution → **Ad Performance** 💰
