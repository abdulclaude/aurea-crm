# UTM Attribution System - Complete Analysis

## Executive Summary

The UTM tracking system is **fully functional** and implements **multi-touch attribution** correctly. However, there may be confusion about which attribution model is being displayed in different parts of the UI.

---

## ✅ What's Working Correctly

### 1. SDK → Backend Data Flow
- **SDK** (`aurea-tracking-sdk/src/index.ts:1166-1172`): Extracts UTM parameters from URL query string
- **API** (`src/app/api/track/events/route.ts:51-57`): Validates and receives UTM data
- **Inngest** (`src/inngest/functions/process-tracking-events.ts:141-145`): Extracts UTMs from event context

### 2. Multi-Touch Attribution Storage

The system stores **BOTH** first-touch and last-touch attribution:

**Database Schema (`FunnelSession`):**
```prisma
// First-touch attribution (what brought them originally)
firstSource      String?
firstMedium      String?
firstCampaign    String?
firstReferrer    String?
firstPageUrl     String?

// Last-touch attribution (most recent interaction)
lastSource       String?
lastMedium       String?
lastCampaign     String?
lastPageUrl      String?
```

**Inngest Processing (`process-tracking-events.ts`):**

**Session Creation (lines 380-388):**
```typescript
// First event in session
firstSource: firstEvent.utmSource,
firstMedium: firstEvent.utmMedium,
firstCampaign: firstEvent.utmCampaign,

// Also sets last-touch initially
lastSource: lastEvent.utmSource,
lastMedium: lastEvent.utmMedium,
lastCampaign: lastEvent.utmCampaign,
```

**Session Updates (lines 425-427):**
```typescript
// Updates on every new event batch
lastSource: lastEvent.utmSource,
lastMedium: lastEvent.utmMedium,
lastCampaign: lastEvent.utmCampaign,
```

### 3. Individual Event Tracking

**Every `FunnelEvent` record also stores UTMs:**
```typescript
utmSource: evt.context.utm?.source,
utmMedium: evt.context.utm?.medium,
utmCampaign: evt.context.utm?.campaign,
utmTerm: evt.context.utm?.term,
utmContent: evt.context.utm?.content,
```

This enables **event-level attribution** analysis (e.g., which UTM was present during conversion event).

---

## 🎯 Attribution Models Explained

### First-Touch Attribution
**Purpose:** Track the original source that brought the visitor to your site.

**Use case:** "How did this visitor discover us?"

**Example:**
1. User clicks Discord link: `?utm_source=discord&utm_medium=social`
2. Browses site for 5 minutes
3. Leaves and comes back via Google search (no UTMs)
4. Converts

**Result:** `firstSource = "discord"`, `lastSource = null` (or "google" if they had UTMs on return)

### Last-Touch Attribution
**Purpose:** Track the most recent interaction before conversion.

**Use case:** "What was the final touchpoint that led to conversion?"

**Example:**
1. User clicks Discord link: `?utm_source=discord`
2. Leaves
3. Returns via email campaign: `?utm_source=email&utm_campaign=newsletter`
4. Converts

**Result:** `firstSource = "discord"`, `lastSource = "email"`

### When to Use Each

| Scenario | Use This |
|----------|----------|
| Marketing attribution (ROI) | **First-touch** - Credit the channel that acquired the user |
| Conversion optimization | **Last-touch** - See what finally convinced them |
| Full journey analysis | **Both** - Understand the complete path |
| Content marketing | **First-touch** - See which content attracts visitors |
| Retargeting campaigns | **Last-touch** - Measure effectiveness of follow-up |

---

## 📊 Current UI Implementation

### ✅ Correctly Using First-Touch

**1. Traffic Sources Table** (`traffic-sources-table.tsx`)
- Router: `getTrafficSources` (line 480-513 in `external-funnels-router.ts`)
- Groups by: `firstSource`, `firstMedium`, `firstCampaign`
- **Correct** - Shows acquisition channels

**2. Sessions Table** (`sessions-table.tsx:203-217`)
- Displays: `row.original.firstSource` and `row.original.firstMedium`
- Shows "Direct" when both are null
- **Correct** - Shows how each session started

**3. UTM Analytics** (`external-funnels-router.ts:698-808`)
- Router: `getUTMAnalytics`
- Uses: `firstSource`, `firstMedium`, `firstCampaign`
- **Correct** - Analyzes acquisition performance

### ⚠️ Potentially Incorrect

**4. Analytics Overview** (`external-funnels-router.ts:200-240`)
- Router: `getAnalytics`
- **Line 201-210:** Queries `FunnelEvent.utmSource` (event-level)
- **Line 224:** Maps to "Direct" if null
- **Issue:** Inconsistent with session-based attribution used elsewhere

**Should probably use:**
```typescript
// Instead of querying FunnelEvent.utmSource (lines 201-210)
const sessions = await db.funnelSession.groupBy({
  by: ["firstSource", "firstMedium", "firstCampaign"],
  where: { funnelId, startedAt: { gte: dateFrom } },
  _count: { id: true },
});
```

### ❓ Not Currently Using Last-Touch

**No queries currently use `lastSource`, `lastMedium`, `lastCampaign`.**

**Potential use cases:**
- Conversion attribution report: "What was the final touchpoint before conversion?"
- A/B test impact: "Did our retargeting campaign drive the final conversion?"
- Multi-touch journey: "Show me first → last attribution for converted sessions"

---

## 🐛 User's Reported Issue

**Problem:** User visited `localhost:3001?utm_source=discord&utm_medium=social&utm_campaign=launch_day` but sees "direct" in CRM.

**Possible Causes:**

### 1. SDK Not Loaded
- Verify SDK script is on the page
- Check browser console for `[Aurea SDK] Initialized` message

### 2. CORS/API Issue
- Events might not be reaching backend
- Check Network tab for `/api/track/events` requests
- Status should be 200, not 4xx/5xx

### 3. Session Already Started
- If session started BEFORE adding UTMs, `firstSource` is already null
- Last-touch UTMs would update, but first-touch stays null
- **Solution:** Clear cookies/start new session

### 4. Async Processing Delay
- Events are processed by Inngest (background job)
- May take 1-5 seconds to appear in CRM
- **Solution:** Wait a few seconds, refresh page

### 5. Wrong Funnel Being Viewed
- User might be looking at wrong funnel in CRM
- Check funnel ID matches the site with SDK installed

---

## 🔍 Debugging Steps

### 1. Test SDK Locally
```bash
# Visit your site with UTMs
open http://localhost:3001?utm_source=test&utm_medium=debug&utm_campaign=verify

# Check browser console (DevTools)
# Should see: [Aurea SDK] Event tracked: page_view { context: { utm: { source: "test" ... }}}
```

### 2. Check Database Directly
```sql
-- Get recent sessions with UTMs
SELECT 
  sessionId,
  firstSource,
  firstMedium,
  firstCampaign,
  lastSource,
  lastMedium,
  lastCampaign,
  startedAt,
  converted
FROM FunnelSession 
WHERE funnelId = 'YOUR_FUNNEL_ID'
ORDER BY startedAt DESC 
LIMIT 10;
```

### 3. Check Events Table
```sql
-- Verify events have UTMs
SELECT 
  eventId,
  eventName,
  utmSource,
  utmMedium,
  utmCampaign,
  timestamp
FROM FunnelEvent
WHERE sessionId = 'SESSION_ID_FROM_ABOVE'
ORDER BY timestamp ASC;
```

### 4. Check Inngest Dashboard
```
http://localhost:8288

# Look for:
- Function: process-tracking-events
- Status: Success (not Failed)
- Check logs for errors
```

---

## 🛠️ Recommended Enhancements

### 1. Add Last-Touch Attribution Views

**Create a new tRPC query:**
```typescript
getConversionAttribution: protectedProcedure
  .input(z.object({ funnelId: z.string(), timeRange: z.enum(["7d", "30d", "90d"]) }))
  .query(async ({ input }) => {
    // Get converted sessions with BOTH first and last touch
    const conversions = await db.funnelSession.findMany({
      where: {
        funnelId: input.funnelId,
        converted: true,
        startedAt: { gte: dateFrom },
      },
      select: {
        firstSource: true,
        firstMedium: true,
        firstCampaign: true,
        lastSource: true,
        lastMedium: true,
        lastCampaign: true,
        conversionValue: true,
      },
    });

    // Compare first vs last touch for conversions
    return {
      firstTouch: groupBy(conversions, ["firstSource", "firstMedium"]),
      lastTouch: groupBy(conversions, ["lastSource", "lastMedium"]),
      assisted: conversions.filter(c => 
        c.firstSource !== c.lastSource && c.lastSource !== null
      ),
    };
  });
```

**Add UI Component:**
```tsx
// Show first-touch vs last-touch comparison
<Card>
  <CardHeader>
    <CardTitle>Conversion Attribution</CardTitle>
    <CardDescription>First-touch vs Last-touch analysis</CardDescription>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="first-touch">
      <TabsList>
        <TabsTrigger value="first-touch">First Touch (Acquisition)</TabsTrigger>
        <TabsTrigger value="last-touch">Last Touch (Conversion)</TabsTrigger>
        <TabsTrigger value="assisted">Assisted Conversions</TabsTrigger>
      </TabsList>
      {/* Show different attribution models */}
    </Tabs>
  </CardContent>
</Card>
```

### 2. Add Attribution Model Selector

Let users choose which model to view:
```tsx
<Select value={attributionModel} onValueChange={setAttributionModel}>
  <SelectItem value="first-touch">First-Touch Attribution</SelectItem>
  <SelectItem value="last-touch">Last-Touch Attribution</SelectItem>
  <SelectItem value="linear">Linear (Equal Credit)</SelectItem>
</Select>
```

### 3. Journey Visualization

Show full attribution path for each conversion:
```
Session #abc123:
  First Touch: Discord (Social) → launch_day
  ↓ (browsed for 5 mins)
  Return Visit: Email → newsletter_week2
  ↓ (converted)
  Last Touch: Email → newsletter_week2
  
  Value: $99.00
```

### 4. Fix `getAnalytics` Query

**Current (lines 201-240):**
```typescript
// BROKEN: Uses event-level UTMs with distinct
const trafficSourcesRaw = await db.funnelEvent.findMany({
  where: whereClause,
  select: { utmSource: true, utmMedium: true, utmCampaign: true },
  distinct: ["utmSource", "utmMedium", "utmCampaign"],
});
```

**Fixed:**
```typescript
// Use session-based first-touch attribution
const trafficSources = await db.funnelSession.groupBy({
  by: ["firstSource", "firstMedium", "firstCampaign"],
  where: { funnelId, startedAt: { gte: dateFrom } },
  _count: { id: true },
  orderBy: { _count: { id: "desc" } },
  take: 10,
});

return trafficSources.map(source => ({
  source: source.firstSource || "Direct",
  medium: source.firstMedium || "None",
  campaign: source.firstCampaign || "None",
  sessions: source._count.id,
}));
```

---

## 📝 Summary

**System Status: ✅ FULLY FUNCTIONAL**

The UTM tracking system correctly implements:
- ✅ SDK captures UTMs from URL
- ✅ API receives and validates UTM data
- ✅ Inngest stores UTMs in both FunnelEvent and FunnelSession
- ✅ Multi-touch attribution (first + last touch)
- ✅ UI displays first-touch attribution in most places

**Potential Issues:**
1. `getAnalytics` query uses event-level UTMs instead of session-level (inconsistent)
2. Last-touch attribution is stored but never displayed in UI
3. User may be experiencing async processing delay or session persistence

**Recommended Actions:**
1. Fix `getAnalytics` to use session-based first-touch attribution
2. Add last-touch attribution views for conversion analysis
3. Add attribution model selector to let users choose view
4. Add debug mode to help users verify UTMs are being captured

**Test Command:**
```bash
# 1. Visit with UTMs
open http://localhost:3001?utm_source=discord&utm_medium=social&utm_campaign=test

# 2. Check browser console for:
[Aurea SDK] Event tracked: page_view { context: { utm: { source: "discord", medium: "social", campaign: "test" }}}

# 3. Wait 5 seconds for Inngest processing

# 4. Check CRM → Funnels → Analytics → Traffic Sources
# Should show: Discord | Social | test
```
