# Ad Platform Integration - Phase 1 Complete! 🎉

## Implementation Summary - December 29, 2025

We've successfully implemented **Phase 1: Click ID Tracking** for advertising platform attribution in the Aurea CRM funnel tracking system.

---

## ✅ What Was Completed

### 1. Comprehensive Research ✅
- **10 major ad platforms** researched (Meta, Google, TikTok, Microsoft, Twitter, LinkedIn, Snapchat, Pinterest, Reddit, Amazon)
- **Click ID parameters** documented for each platform
- **Attribution windows** identified (28-90 days)
- **Privacy compliance** requirements (GDPR, CCPA, iOS 14.5+)
- **Conversion API** requirements for server-side tracking

**Documents Created**:
- `AD_PLATFORM_RESEARCH.md` - Deep technical research (10,000+ words)
- `AD_PLATFORM_INTEGRATION_PLAN.md` - Implementation roadmap

### 2. Database Schema ✅
**Migration**: `20251229180808_add_ad_platform_click_ids`

**Added to `FunnelEvent` table**:
- Meta/Facebook: `fbclid`, `fbp`, `fbc`
- Google Ads: `gclid`, `gbraid`, `wbraid`, `dclid`
- TikTok: `ttclid`, `ttp`
- Microsoft/Bing: `msclkid`
- Twitter/X: `twclid`
- LinkedIn: `li_fat_id`
- Snapchat: `ScCid`
- Pinterest: `epik`
- Reddit: `rdt_cid`

**Added to `FunnelSession` table**:
- First touch click IDs: `firstFbclid`, `firstGclid`, `firstTtclid`, etc.
- Last touch click IDs: `lastFbclid`, `lastGclid`, `lastTtclid`, etc.
- First-party cookies: `fbp`, `fbc`, `ttp`
- **Conversion platform**: `conversionPlatform` (auto-determined from click IDs)

**Indices Added**:
- `@@index([fbclid])`
- `@@index([gclid])`
- `@@index([ttclid])`
- `@@index([msclkid])`

### 3. SDK Updates ✅
**File**: `aurea-tracking-sdk/src/index.ts`

**New Features**:
1. **Click ID Extraction** - Automatically captures all click IDs from URL parameters
2. **Cookie Reading** - Captures first-party cookies (`_fbp`, `_fbc`, `_ttp`)
3. **localStorage Persistence** - Stores click IDs with attribution windows:
   - Facebook: 28 days
   - Google: 90 days
   - TikTok: 28 days
   - Microsoft: 90 days
   - Others: 30 days
4. **Automatic Expiration** - Removes expired click IDs based on platform-specific windows
5. **Debug Logging** - Shows click ID extraction in console when `debug: true`

**New Methods**:
- `getCookie(name)` - Read browser cookies
- `storeClickIds(clickIds)` - Persist to localStorage with timestamps
- `getStoredClickIds()` - Retrieve non-expired click IDs
- `getAttributionWindow(platform)` - Platform-specific windows

**SDK Version**: 1.5.2 (built and ready)

### 4. Backend Processing ✅
**File**: `src/inngest/functions/process-tracking-events.ts`

**Updates**:
1. **TypeScript Interface** - Added `clickIds` and `cookies` to `TrackingEvent` context
2. **Event Enrichment** - Extracts click IDs and cookies from event context
3. **Session Attribution** - Stores first/last touch click IDs
4. **Platform Detection** - Auto-determines `conversionPlatform`:
   ```typescript
   fbclid ? 'facebook'
   : gclid ? 'google'
   : ttclid ? 'tiktok'
   : msclkid ? 'microsoft'
   : twclid ? 'twitter'
   : li_fat_id ? 'linkedin'
   : utmSource === 'google' && !gclid ? 'google-organic'
   : utmSource ? utmSource
   : referrer ? 'referral'
   : 'direct'
   ```
5. **Debug Logging** - Console logs for troubleshooting

---

## 🧪 How to Test

### Test URLs

Visit these URLs on your TTR site (or any site with Aurea tracking):

#### Facebook/Meta Ads
```
http://localhost:3001/?utm_source=facebook&utm_medium=cpc&utm_campaign=summer-sale&fbclid=IwAR1test123abc
```

#### Google Ads
```
http://localhost:3001/?utm_source=google&utm_medium=cpc&utm_campaign=brand-search&gclid=Cj0KCtest456def
```

#### TikTok Ads
```
http://localhost:3001/?utm_source=tiktok&utm_medium=paid-social&utm_campaign=viral-video&ttclid=7test789ghi
```

#### Microsoft/Bing Ads
```
http://localhost:3001/?utm_source=bing&utm_medium=cpc&utm_campaign=competitor-keywords&msclkid=test012jkl
```

#### Multiple Platforms (Sequential)
1. Visit Google Ads URL first
2. Wait 5 seconds
3. Visit Facebook Ads URL
4. Check database - should have both click IDs stored!

### Verification Checklist

1. **Browser Console**:
   - [ ] See `[Aurea SDK] UTM params extracted from URL:`
   - [ ] See `[Aurea SDK] Click IDs extracted:`
   - [ ] See `[Aurea SDK] First-party cookies extracted:`
   - [ ] See `[Aurea SDK] Sending page_view with UTM:`

2. **localStorage**:
   - [ ] Open DevTools → Application → Local Storage
   - [ ] Check for `aurea_click_ids` key
   - [ ] Should contain JSON with platform, id, timestamp, expiresAt

3. **Database** (FunnelEvent table):
   ```sql
   SELECT eventName, fbclid, gclid, ttclid, msclkid, fbp, fbc
   FROM "FunnelEvent"
   ORDER BY timestamp DESC
   LIMIT 5;
   ```
   - [ ] Click IDs populated for ad platform URLs
   - [ ] Cookies (`fbp`, `fbc`, `ttp`) populated if present

4. **Database** (FunnelSession table):
   ```sql
   SELECT 
     sessionId,
     firstFbclid, firstGclid, firstTtclid,
     lastFbclid, lastGclid, lastTtclid,
     conversionPlatform,
     fbp, fbc
   FROM "FunnelSession"
   ORDER BY startedAt DESC
   LIMIT 5;
   ```
   - [ ] First touch click IDs match first event
   - [ ] Last touch click IDs match most recent event
   - [ ] `conversionPlatform` correctly identified

5. **Attribution Window Test**:
   - [ ] Visit with `fbclid` parameter
   - [ ] Navigate to another page (without fbclid)
   - [ ] Check that click ID persists in events
   - [ ] Should persist for 28 days

---

## 📊 What You Can Now Track

### Platform Attribution
- **First-touch attribution**: Which platform brought the user initially?
- **Last-touch attribution**: Which platform drove the conversion?
- **Multi-touch attribution**: See all platforms in the user journey

### Conversion Platform Breakdown
Query sessions by platform:
```sql
SELECT 
  conversionPlatform,
  COUNT(*) as sessions,
  SUM(CASE WHEN converted THEN 1 ELSE 0 END) as conversions,
  ROUND(AVG(durationSeconds), 0) as avg_duration
FROM "FunnelSession"
WHERE conversionPlatform IS NOT NULL
GROUP BY conversionPlatform
ORDER BY sessions DESC;
```

Expected results:
- `facebook` - Facebook/Meta ads traffic
- `google` - Google Ads paid traffic
- `google-organic` - Google organic (SEO)
- `tiktok` - TikTok ads
- `microsoft` - Bing/Microsoft ads
- `direct` - Direct traffic
- `referral` - Traffic from other sites

### Click ID Reporting
See which specific ad clicks converted:
```sql
SELECT 
  sessionId,
  firstFbclid,
  firstGclid,
  converted,
  conversionValue,
  startedAt
FROM "FunnelSession"
WHERE converted = true
  AND (firstFbclid IS NOT NULL OR firstGclid IS NOT NULL)
ORDER BY startedAt DESC
LIMIT 10;
```

This lets you:
- Send conversion data back to ad platforms (Conversion API)
- Track ROAS by specific campaigns
- Identify which ads are performing best

---

##  Next Steps (Phase 2)

Now that we can track click IDs, here's what comes next:

### 1. Server-Side Conversion APIs 
**Priority: HIGH** (Required for iOS 14.5+ users)

Implement conversion tracking back to ad platforms:
- **Meta Conversion API** - Send purchases to Facebook
- **Google Enhanced Conversions** - Send to Google Ads
- **TikTok Events API** - Send to TikTok

This is critical because:
- 70-80% of iOS users block client-side tracking
- Server-side tracking has 30% higher match rates
- Required for accurate attribution

### 2. Analytics Dashboard 
Create `/funnels/[funnelId]/analytics/ads` page showing:
- Traffic by platform
- Conversion rate by platform
- Revenue by platform
- Click ID → Conversion mapping

### 3. Ad Spend Import
Pull daily spend from platforms:
- Meta Marketing API
- Google Ads API
- TikTok Ads API

Calculate ROAS:
```
ROAS = Revenue from Platform / Ad Spend
```

### 4. Multi-Touch Attribution Models
Implement attribution models:
- **First-touch**: Credit to first ad click
- **Last-touch**: Credit to last ad click
- **Linear**: Equal credit to all touchpoints
- **Time-decay**: More credit to recent clicks
- **Position-based**: 40% first, 40% last, 20% middle

---

## 🎯 Success Metrics

After implementation, you can now answer:

1. **Which platform drives the most traffic?**
   - Query: Count sessions by `conversionPlatform`

2. **Which platform has the highest conversion rate?**
   - Query: `converted = true` grouped by `conversionPlatform`

3. **Which specific ad click converted?**
   - Query: Join sessions with click IDs to trace back to exact ad

4. **How long do users from each platform stay?**
   - Query: Average `durationSeconds` by `conversionPlatform`

5. **Multi-touch attribution: What's the full journey?**
   - Query: All events for a session, ordered by timestamp
   - See: First click (Google) → Middle click (Facebook) → Conversion (Email)

---

## 📚 Technical Details

### Attribution Window Logic
```typescript
// Facebook: 28 days
// Google: 90 days
// TikTok: 28 days
// Microsoft: 90 days
// Default: 30 days

const windows = {
  fbclid: 28 * 24 * 60 * 60 * 1000,
  gclid: 90 * 24 * 60 * 60 * 1000,
  ttclid: 28 * 24 * 60 * 60 * 1000,
  msclkid: 90 * 24 * 60 * 60 * 1000,
};
```

### Cookie Reading
The SDK captures first-party cookies set by ad platforms:
- `_fbp` - Facebook Browser ID (90 days)
- `_fbc` - Facebook Click Cookie (stores fbclid)
- `_ttp` - TikTok Browser ID

These are critical for **Conversion API** (Phase 2) to match conversions back to ad clicks.

### Platform Priority
When multiple click IDs exist, priority order:
1. Facebook (`fbclid`)
2. Google (`gclid`)
3. TikTok (`ttclid`)
4. Microsoft (`msclkid`)
5. Twitter (`twclid`)
6. LinkedIn (`li_fat_id`)
7. UTM source
8. Referrer
9. Direct

---

## 🐛 Troubleshooting

### Click IDs Not Captured
**Symptom**: Database shows NULL for click IDs
**Check**:
1. Browser console - Are click IDs logged by SDK?
2. Network tab - Is `context.clickIds` in the API request?
3. Database - Did the migration run? Check for new columns

**Fix**:
- Clear browser cache and localStorage
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
- Check URL actually has click ID parameters

### localStorage Not Persisting
**Symptom**: Click IDs disappear on page navigation
**Check**:
1. DevTools → Application → Local Storage → `aurea_click_ids`
2. Check if browser is in private/incognito mode
3. Check if user has disabled localStorage

**Fix**:
- Use regular browser window (not incognito)
- Check browser settings for localStorage

### Attribution Window Expired
**Symptom**: Old click IDs not showing up
**Check**:
```javascript
const stored = JSON.parse(localStorage.getItem('aurea_click_ids'));
console.log('Stored click IDs:', stored);
console.log('Current time:', Date.now());
```

**Fix**:
- This is expected behavior - click IDs expire
- Facebook: 28 days
- Google: 90 days

### Wrong Platform Detected
**Symptom**: `conversionPlatform` says "facebook" but user came from Google
**Check**:
- First event of the session - what click IDs did it have?
- Platform detection follows priority order (see above)

**Fix**:
- If both `fbclid` and `gclid` exist, Facebook takes priority
- This is by design - adjust priority in backend if needed

---

## 📖 Resources Created

1. **`AD_PLATFORM_RESEARCH.md`** - Comprehensive research document
2. **`AD_PLATFORM_INTEGRATION_PLAN.md`** - Implementation roadmap
3. **`UTM_TRACKING_FIX.md`** - Previous UTM fix documentation
4. **Migration**: `20251229180808_add_ad_platform_click_ids`
5. **This document**: Implementation summary

---

## 🚀 Ready for Production

Phase 1 is **production-ready**:
- ✅ Database schema updated
- ✅ SDK capturing click IDs
- ✅ Backend processing and storing data
- ✅ Attribution windows implemented
- ✅ Debug logging in place
- ✅ Tested locally

**To deploy**:
1. Deploy SDK update to TTR (already linked locally)
2. Database migration already applied
3. Backend code already updated
4. Test with real ad campaigns!

---

## 💡 Quick Win: See Your Data Now!

Run this query to see it working:

```sql
-- See all platform traffic
SELECT 
  conversionPlatform,
  COUNT(*) as sessions,
  SUM(CASE WHEN converted THEN 1 ELSE 0 END) as conversions,
  ROUND(SUM(CAST(conversionValue AS NUMERIC)), 2) as revenue
FROM "FunnelSession"
WHERE startedAt >= NOW() - INTERVAL '30 days'
  AND conversionPlatform IS NOT NULL
GROUP BY conversionPlatform
ORDER BY sessions DESC;
```

This will show you:
- Traffic sources
- Conversion counts
- Revenue by platform

Perfect for a dashboard! 📊

---

**Implementation completed**: December 29, 2025
**Phase 1 Status**: ✅ COMPLETE
**Ready for**: Phase 2 (Conversion APIs)

Let's track those conversions! 🎯
