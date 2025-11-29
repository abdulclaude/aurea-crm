# Analytics System Documentation

## Overview

The analytics system in Aurea CRM provides a unified logging solution that tracks both activity timeline events and PostHog analytics events simultaneously. Whenever an action occurs in the system (creating contacts, deals, workflows, etc.), both the Activity log and PostHog are updated automatically.

## Architecture

### 1. Unified Logging Middleware

**File**: `/src/lib/analytics-logger.ts`

This is the core of the system - a single function that logs to both Activity timeline and PostHog:

```typescript
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";

await logAnalytics({
  organizationId: orgId,
  subaccountId: subaccountId ?? null,
  userId: ctx.auth.user.id,
  action: ActivityAction.CREATED,
  entityType: "deal",
  entityId: deal.id,
  entityName: deal.name,
  metadata: {
    // Metadata for Activity timeline
    value: deal.value?.toString(),
    currency: deal.currency,
  },
  posthogProperties: {
    // Additional properties for PostHog
    value: deal.value ? Number(deal.value) : null,
    currency: deal.currency,
    has_deadline: !!deal.deadline,
  },
});
```

### 2. Analytics Aggregation Router

**File**: `/src/features/analytics/server/analytics-router.ts`

Provides tRPC endpoints to fetch aggregated analytics data from the Activity log:

- `analytics.getWorkflowAnalytics()` - Workflow execution stats
- `analytics.getContactAnalytics()` - Contact creation and lifecycle analytics
- `analytics.getDealAnalytics()` - Deal pipeline and conversion analytics
- `analytics.getUserBehaviorAnalytics()` - User activity patterns
- `analytics.getTopEntities()` - Most active entities by type

### 3. PostHog Integration

**File**: `/src/lib/posthog/server.ts`

Server-side PostHog client for capturing events:

```typescript
import { getPostHogClient } from "@/lib/posthog/server";

const client = getPostHogClient();
client.capture({
  distinctId: userId,
  event: "deal_created",
  properties: {
    organization_id: orgId,
    subaccount_id: subaccountId,
    value: 10000,
    currency: "USD",
  },
});
```

## How It Works

### Event Flow

1. **User Action** → User creates/updates/deletes an entity
2. **logAnalytics()** → Called from tRPC router
3. **Activity Log** → Event saved to Prisma database
4. **PostHog Event** → Event sent to PostHog API
5. **Analytics Dashboard** → Displays aggregated data

```
┌─────────────┐
│ User Action │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  logAnalytics()  │
└────────┬─────────┘
         │
    ┌────┴────┐
    v         v
┌───────┐ ┌─────────┐
│Activity│ │PostHog  │
│  Log   │ │  Event  │
└───────┘ └─────────┘
    │         │
    └────┬────┘
         v
  ┌──────────────┐
  │  Analytics   │
  │  Dashboard   │
  └──────────────┘
```

## Implementation Guide

### Step 1: Use logAnalytics in Routers

Replace `logActivity()` calls with `logAnalytics()`:

**Before:**
```typescript
import { logActivity } from "@/features/activity/lib/log-activity";

await logActivity({
  organizationId: orgId,
  subaccountId: subaccountId ?? null,
  userId: ctx.auth.user.id,
  type: ActivityType.CONTACT,
  action: ActivityAction.CREATED,
  entityType: "contact",
  entityId: contact.id,
  entityName: contact.name,
});
```

**After:**
```typescript
import { logAnalytics } from "@/lib/analytics-logger";

await logAnalytics({
  organizationId: orgId,
  subaccountId: subaccountId ?? null,
  userId: ctx.auth.user.id,
  action: ActivityAction.CREATED,
  entityType: "contact",
  entityId: contact.id,
  entityName: contact.name,
  posthogProperties: {
    // Additional PostHog-specific properties
    email: contact.email,
    lifecycle_stage: contact.lifecycleStage,
    lead_score: contact.leadScore,
  },
});
```

### Step 2: Add PostHog Properties

Include relevant properties for analytics:

**Workflow Events:**
```typescript
posthogProperties: {
  success: true,
  duration_ms: 1234,
  nodes_executed: 5,
  trigger_type: "manual",
}
```

**Contact Events:**
```typescript
posthogProperties: {
  contact_type: "LEAD",
  lifecycle_stage: "QUALIFIED",
  lead_score: 85,
  has_assignees: assignees.length > 0,
}
```

**Deal Events:**
```typescript
posthogProperties: {
  value: 10000,
  currency: "USD",
  pipeline_id: pipelineId,
  pipeline_stage_id: stageId,
  is_stage_change: true,
  old_stage_id: oldStageId,
  new_stage_id: newStageId,
}
```

### Step 3: Fetch Analytics Data

Use the analytics router in your components:

```typescript
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

const trpc = useTRPC();

const { data: workflowAnalytics } = useQuery({
  ...trpc.analytics.getWorkflowAnalytics.queryOptions(),
});

const { data: dealAnalytics } = useQuery({
  ...trpc.analytics.getDealAnalytics.queryOptions({
    dateFrom: new Date("2025-01-01"),
    dateTo: new Date(),
  }),
});
```

## What Gets Tracked

### Activities Tracked

| Entity Type | Actions | PostHog Event Names |
|-------------|---------|---------------------|
| **Workflows** | CREATED, UPDATED, DELETED, EXECUTED, ARCHIVED | `workflow_created`, `workflow_executed`, etc. |
| **Contacts** | CREATED, UPDATED, DELETED, LIFECYCLE_CHANGED | `contact_created`, `contact_lifecycle_changed`, etc. |
| **Deals** | CREATED, UPDATED, DELETED, STAGE_CHANGED | `deal_created`, `deal_stage_changed`, etc. |
| **Bundles** | CREATED, UPDATED, DELETED | `bundle_created`, etc. |
| **Pipelines** | CREATED, UPDATED, DELETED | `pipeline_created`, etc. |
| **Workers** | CREATED, UPDATED, DELETED | `worker_created`, etc. |
| **Time Logs** | CREATED, UPDATED, DELETED | `time_log_created`, etc. |
| **Invites** | CREATED, ACCEPTED, REJECTED | `invite_created`, etc. |
| **Members** | ADDED, UPDATED, REMOVED | `member_added`, etc. |

### Event Properties Included

Every event includes:

**Base Properties:**
- `entity_type` - Type of entity (e.g., "contact", "deal")
- `entity_id` - Unique ID of the entity
- `entity_name` - Name of the entity
- `action` - Action performed (e.g., "CREATED", "UPDATED")
- `organization_id` - Organization context
- `subaccount_id` - Subaccount context (if applicable)
- `$groups` - PostHog groups for multi-tenant analysis

**Custom Properties:**
Defined per entity type in `posthogProperties`

## Viewing Analytics

### Option 1: Built-in Analytics Dashboard

Navigate to `/analytics` in your app to view:

- **Overview** - Summary metrics across all entities
- **Workflows** - Execution stats, success rates, duration
- **Contacts** - Contact creation, lifecycle changes
- **Deals** - Pipeline metrics, win rates
- **User Behaviour** - Activity patterns and engagement
- **Funnels** - Conversion funnels (coming soon)

### Option 2: PostHog Dashboard

1. Go to [app.posthog.com](https://app.posthog.com)
2. Create **Insights** and **Dashboards**
3. Filter by organization/subaccount using `$groups`

**Example Insight:**
- Event: `deal_created`
- Filter: `properties.organization_id == "org_abc123"`
- Breakdown: `properties.pipeline_id`
- Time range: Last 30 days

### Option 3: Embed PostHog Dashboards

Embed PostHog dashboards directly in the analytics page:

```typescript
<div className="h-[600px] w-full">
  <iframe
    src="https://app.posthog.com/embedded/YOUR_DASHBOARD_ID"
    className="w-full h-full border-0 rounded-lg"
  />
</div>
```

## Advanced Usage

### Custom Event Names

Override the default event name:

```typescript
await logAnalytics({
  // ... other params
  posthogEvent: "custom_event_name",
  posthogProperties: {
    custom_property: "value",
  },
});
```

### Tracking Changes

The `getChangedFields` helper tracks what changed:

```typescript
const changes = getChangedFields(oldData, newData);

await logAnalytics({
  // ... other params
  changes, // Stored in Activity log
  posthogProperties: {
    fields_changed: changes ? Object.keys(changes) : [],
  },
});
```

### Multi-Tenant Analysis

Events are automatically grouped by organization and subaccount:

```typescript
// In PostHog, filter by:
$group_0 (organization) == "org_abc123"
$group_1 (subaccount) == "sub_xyz789"

// Or in queries:
properties.organization_id == "org_abc123"
properties.subaccount_id == "sub_xyz789"
```

## Files Modified

### Core Files Created

1. `/src/lib/analytics-logger.ts` - Unified logging middleware
2. `/src/features/analytics/server/analytics-router.ts` - Analytics aggregation
3. `/src/features/analytics/server/posthog-router.ts` - PostHog integration (placeholder)

### Routers Updated

1. `/src/features/crm/server/deals-router.ts` - Uses logAnalytics
2. `/src/features/crm/server/contacts-router.ts` - Uses logAnalytics

**TODO:** Update these routers to use `logAnalytics`:
- `/src/features/workflows/server/routers.ts`
- `/src/features/bundles/server/routers.ts`
- `/src/features/crm/server/pipelines-router.ts`
- `/src/features/workers/server/router.ts`
- `/src/features/time-tracking/server/router.ts`
- `/src/features/organizations/server/routers.ts` (for invites/members)

### Frontend Updates

1. `/src/app/(dashboard)/(rest)/analytics/page.tsx` - Uses new analytics router
2. `/src/trpc/routers/_app.ts` - Exports analytics router

## Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Benefits

### 1. Single Source of Truth
One function logs to both Activity and PostHog - no duplicate code.

### 2. Consistent Event Structure
All events have the same base properties and naming conventions.

### 3. Real-time Analytics
PostHog receives events immediately for real-time dashboards.

### 4. Historical Analysis
Activity log stores all events for custom queries and reporting.

### 5. Multi-Tenant Support
Automatic organization/subaccount grouping for segmented analytics.

### 6. Flexible Styling
Fetch raw data and style it yourself in the analytics dashboard.

## Next Steps

1. **Update Remaining Routers**: Add `logAnalytics` to all CRUD operations
2. **Add More Properties**: Enrich events with additional context
3. **Create PostHog Dashboards**: Build insights and funnels in PostHog
4. **Custom Visualizations**: Use the analytics router data to build custom charts
5. **Set Up Alerts**: Configure PostHog alerts for critical metrics

## Troubleshooting

### Events not appearing in PostHog?

1. Check console for errors
2. Verify `NEXT_PUBLIC_POSTHOG_KEY` is correct
3. Check PostHog project → Ingestion → Live events
4. Wait 30-60 seconds (PostHog buffers events)

### Analytics data seems incorrect?

1. Check Activity log in database: `SELECT * FROM "Activity" ORDER BY "createdAt" DESC LIMIT 10;`
2. Verify `organizationId` and `subaccountId` filters
3. Check date range filters in queries

### Performance issues?

1. Add indexes to Activity table for common queries
2. Use date range filters to limit data
3. Consider archiving old activities

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React Guide](https://posthog.com/docs/libraries/react)
- [PostHog Group Analytics](https://posthog.com/docs/product-analytics/group-analytics)
