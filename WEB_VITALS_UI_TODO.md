# Web Vitals UI - Implementation Guide

## Status: Prisma Models Generated ✅
The database migration has been applied and Prisma client regenerated.

##  Remaining Tasks

### 1. Add Web Vitals Router to tRPC
File: `src/trpc/routers/_app.ts`

Add the web vitals router:
```typescript
import { webVitalsRouter } from "@/features/external-funnels/server/web-vitals-router";

export const appRouter = createTRPCRouter({
  // ... existing routers
  webVitals: webVitalsRouter,
});
```

### 2. Create Web Vitals Table Component
File: `src/features/external-funnels/components/web-vitals-table.tsx`

Similar structure to `events-table.tsx` but for web vitals:
- Columns: Metric, Value, Rating, Page, Device, Browser, Timestamp
- Filters: Metric type, Rating, Page URL, Device type
- Sortable by: Timestamp, Value, Metric
- Use `DataTable` component
- Use cursor-based pagination

### 3. Create Web Vitals Toolbar
File: `src/features/external-funnels/components/web-vitals-toolbar.tsx`

Similar to `events-toolbar.tsx`:
- Search by page URL
- Filter by metric (LCP, INP, CLS, FCP, TTFB)
- Filter by rating (GOOD, NEEDS_IMPROVEMENT, POOR)
- Filter by device type
- Date range filter
- Sort options

### 4. Create Web Vitals Stats Cards
File: `src/features/external-funnels/components/web-vitals-stats.tsx`

Show overall statistics:
- **Passing Rate Card**: % of all vitals that are "GOOD"
- **LCP Card**: P75 value, % good/needs improvement/poor
- **INP Card**: P75 value, % good/needs improvement/poor  
- **CLS Card**: P75 value, % good/needs improvement/poor
- **FCP Card**: P75 value, % good/needs improvement/poor
- **TTFB Card**: P75 value, % good/needs improvement/poor

Color coding:
- Green: GOOD
- Yellow: NEEDS_IMPROVEMENT
- Red: POOR

### 5. Add Web Vitals Tab to Funnel Analytics
File: `src/features/external-funnels/components/funnel-analytics.tsx`

Add to TABS array:
```typescript
const TABS = [
  // ... existing tabs
  { id: "web-vitals", label: "Web Vitals" },
];
```

Add tab content:
```typescript
{activeTab === "web-vitals" && <WebVitalsTab funnelId={funnelId} />}
```

### 6. Create Web Vitals Tab Component
File: `src/features/external-funnels/components/web-vitals-tab.tsx`

```typescript
export function WebVitalsTab({ funnelId }: { funnelId: string }) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <WebVitalsStats funnelId={funnelId} />
      
      {/* Table with Filters */}
      <WebVitalsTable funnelId={funnelId} />
    </div>
  );
}
```

### 7. Update Tracking API to Use IP Hashing
File: `src/app/api/track/events/route.ts`

Add after line 133 (where IP is detected):
```typescript
import { getPrivacyCompliantIp } from "@/lib/gdpr-utils";

// ... existing IP detection code ...

// Apply privacy settings to IP
const trackingConfig = funnel.trackingConfig as any;
const anonymizeIp = trackingConfig?.anonymizeIp ?? true;
const hashIp = trackingConfig?.hashIp ?? false;

ip = getPrivacyCompliantIp(ip, {
  anonymizeIp,
  hashIp,
});
```

### 8. Create Data Retention Cron Job
File: `src/inngest/functions/data-retention.ts`

```typescript
import { inngest } from "../client";
import db from "@/lib/db";
import { shouldDeleteData } from "@/lib/gdpr-utils";

export const dataRetentionCleanup = inngest.createFunction(
  { id: "data-retention-cleanup", name: "Data Retention Cleanup" },
  { cron: "0 2 * * *" }, // Run daily at 2 AM
  async ({ step }) => {
    await step.run("delete-old-sessions", async () => {
      // Delete sessions older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days default
      
      await db.funnelSession.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });
    });
    
    await step.run("process-deletion-requests", async () => {
      // Delete data for users who requested deletion
      const profiles = await db.anonymousUserProfile.findMany({
        where: {
          deletionRequestedAt: {
            not: null,
          },
        },
      });
      
      for (const profile of profiles) {
        // Delete all associated data
        await db.funnelEvent.deleteMany({
          where: { anonymousId: profile.id },
        });
        
        await db.funnelWebVital.deleteMany({
          where: { anonymousId: profile.id },
        });
        
        await db.funnelSession.deleteMany({
          where: { anonymousId: profile.id },
        });
        
        await db.anonymousUserProfile.delete({
          where: { id: profile.id },
        });
      }
    });
    
    return { success: true };
  }
);
```

Register in `src/inngest/functions.ts`:
```typescript
import { dataRetentionCleanup } from "./functions/data-retention";

export const functions = [
  // ... existing functions
  dataRetentionCleanup,
];
```

## Web Vitals Thresholds

Use these for rating colors and calculations:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP    | ≤ 2.5s | ≤ 4s | > 4s |
| INP    | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS    | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP    | ≤ 1.8s | ≤ 3s | > 3s |
| TTFB   | ≤ 800ms | ≤ 1.8s | > 1.8s |

## Example UI Structure

```
┌─────────────────────────────────────────────────────────┐
│ Web Vitals Tab                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ LCP      │ │ INP      │ │ CLS      │ │ FCP      │  │
│  │ 2.1s ✅  │ │ 150ms ✅ │ │ 0.08 ✅  │ │ 1.5s ✅  │  │
│  │ 85% GOOD │ │ 92% GOOD │ │ 78% GOOD │ │ 88% GOOD │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌──────────┐ ┌────────────────────────────────────┐  │
│  │ TTFB     │ │ Overall Passing Rate                │  │
│  │ 600ms ✅ │ │ 82% of vitals are GOOD ✅           │  │
│  │ 80% GOOD │ │                                      │  │
│  └──────────┘ └────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Filters: [Metric ▼] [Rating ▼] [Device ▼]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Metric  │ Value  │ Rating │ Page        │ Device│   │
│  ├─────────┼────────┼────────┼─────────────┼───────┤   │
│  │ LCP     │ 2.1s   │ ✅ GOOD│ /landing    │ Laptop│   │
│  │ INP     │ 180ms  │ ✅ GOOD│ /landing    │ Laptop│   │
│  │ CLS     │ 0.15   │ ⚠️ NEED│ /checkout   │ Mobile│   │
│  │ FCP     │ 1.2s   │ ✅ GOOD│ /landing    │ Laptop│   │
│  │ TTFB    │ 500ms  │ ✅ GOOD│ /landing    │ Laptop│   │
│  └─────────┴────────┴────────┴─────────────┴───────┘   │
│                                                          │
│  [Load More...]                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Testing

After implementation, test with:
1. Load a funnel page with the SDK
2. Check `/api/track/web-vitals` receives data
3. Verify data appears in database
4. Check Web Vitals tab shows stats and table
5. Test filters and sorting
6. Verify GDPR consent flow works
7. Test data deletion endpoint

## Files Created/Modified Summary

### Created ✅
- `src/lib/gdpr-utils.ts` - GDPR utility functions
- `src/app/api/track/web-vitals/route.ts` - Web Vitals API
- `src/app/api/track/delete/route.ts` - Data deletion API
- `src/features/external-funnels/server/web-vitals-router.ts` - tRPC router (needs fixing)
- `GDPR_WEB_VITALS_IMPLEMENTATION.md` - Documentation

### Need to Create
- `src/features/external-funnels/components/web-vitals-table.tsx`
- `src/features/external-funnels/components/web-vitals-toolbar.tsx`
- `src/features/external-funnels/components/web-vitals-stats.tsx`
- `src/features/external-funnels/components/web-vitals-tab.tsx`
- `src/inngest/functions/data-retention.ts`

### Need to Modify
- `src/trpc/routers/_app.ts` - Add web vitals router
- `src/features/external-funnels/components/funnel-analytics.tsx` - Add tab
- `src/app/api/track/events/route.ts` - Add IP hashing
- `src/inngest/functions.ts` - Register cleanup job
- `~/Desktop/aurea-tracking-sdk` - Already updated ✅

## Quick Start Commands

1. Fix web-vitals-router.ts type errors (model should be available)
2. Create UI components (copy from events-table.tsx pattern)
3. Add router to tRPC app router
4. Create data retention cron job
5. Update events API with IP hashing
6. Test everything!

The database models are ready, SDK is updated, API endpoints exist. Just need the UI and cron job!
