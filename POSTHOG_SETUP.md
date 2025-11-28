# PostHog Analytics Integration Guide

## Overview

PostHog analytics has been integrated into Aurea CRM to track user behavior, workflow performance, contact/deal metrics, and optimize the platform for both agency and client levels.

## Setup Steps

### 1. Get PostHog API Key

1. Create a free account at [posthog.com](https://posthog.com)
2. Create a new project
3. Copy your Project API Key from Project Settings

### 2. Add Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

> **Note**: If you're using PostHog Cloud EU, use `https://eu.i.posthog.com` as the host.

### 3. Restart Development Server

```bash
bun dev
```

## What's Been Implemented

### 1. Core Integration

- ✅ **PostHog Client** (`src/lib/posthog/client.tsx`)
  - Automatic initialization
  - User identification on login
  - Person profiles for identified users only

- ✅ **PostHog Server** (`src/lib/posthog/server.ts`)
  - Server-side event tracking
  - Background job event capture

- ✅ **Analytics Hooks** (`src/lib/posthog/hooks.ts`)
  - `useAnalytics()` - Main hook for tracking events
  - Pre-built event trackers for:
    - Workflows (created, updated, deleted, executed, archived)
    - Contacts (created, updated, deleted, scored, lifecycle_changed)
    - Deals (created, updated, deleted, stage_changed, won, lost)
    - Forms (viewed, started, completed, abandoned)
    - Integrations (connected, disconnected, sync events)

- ✅ **Page View Tracking** (`src/lib/posthog/page-view-tracker.tsx`)
  - Automatic page view capture on route changes
  - Search params included in tracking

- ✅ **Analytics Dashboard** (`/analytics`)
  - Overview metrics
  - Workflow performance
  - CRM analytics
  - Conversion funnels
  - User behavior analysis

### 2. Multi-Tenant Tracking

PostHog is configured to track at two levels:

**Organization Level**:
```typescript
const { setGroupProperties } = useAnalytics();
setGroupProperties("organization", organizationId, {
  name: "Acme Agency",
  plan: "premium",
  created_at: "2024-01-01"
});
```

**Subaccount Level** (Client):
```typescript
setGroupProperties("subaccount", subaccountId, {
  name: "Client XYZ",
  organization_id: organizationId,
  created_at: "2024-01-15"
});
```

## Usage Examples

### Tracking Workflow Events

```typescript
import { useAnalytics } from "@/lib/posthog/hooks";

function MyComponent() {
  const { trackWorkflowEvent } = useAnalytics();

  const handleWorkflowExecute = async (workflowId: string) => {
    // Execute workflow...

    trackWorkflowEvent("executed", workflowId, {
      success: true,
      duration_ms: 1234,
      nodes_executed: 5,
    });
  };
}
```

### Tracking Contact Events

```typescript
const { trackContactEvent } = useAnalytics();

trackContactEvent("lifecycle_changed", contactId, {
  from_stage: "LEAD",
  to_stage: "QUALIFIED",
  score: 85,
});
```

### Tracking Custom Events

```typescript
const { trackEvent } = useAnalytics();

trackEvent("feature_used", {
  feature_name: "ai_email_composer",
  subaccount_id: subaccountId,
  organization_id: organizationId,
});
```

## Events to Track

### Workflows
- ✅ `workflow_created` - When a new workflow is created
- ✅ `workflow_updated` - When a workflow is modified
- ✅ `workflow_executed` - When a workflow runs (with success/failure)
- ✅ `workflow_deleted` - When a workflow is removed
- ✅ `workflow_archived` - When a workflow is archived
- 📝 `node_added` - When a node is added to a workflow
- 📝 `node_configured` - When a node is configured

### CRM
- ✅ `contact_created` - New contact added
- ✅ `contact_updated` - Contact details changed
- ✅ `contact_lifecycle_changed` - Lifecycle stage movement
- ✅ `contact_scored` - Lead score updated
- ✅ `contact_deleted` - Contact removed
- ✅ `deal_created` - New deal created
- ✅ `deal_stage_changed` - Deal moved in pipeline
- ✅ `deal_won` - Deal closed as won
- ✅ `deal_lost` - Deal closed as lost
- 📝 `email_sent` - Email sent to contact
- 📝 `task_created` - Task assigned

### Forms & Funnels
- ✅ `form_viewed` - Form loaded
- ✅ `form_started` - User started filling form
- ✅ `form_completed` - Form submitted
- ✅ `form_abandoned` - User left without submitting
- 📝 `field_interaction` - User interacted with form field

### Integrations
- ✅ `integration_connected` - OAuth integration connected
- ✅ `integration_disconnected` - Integration removed
- ✅ `integration_sync_started` - Sync initiated
- ✅ `integration_sync_completed` - Sync finished
- ✅ `integration_sync_failed` - Sync error

### User Behavior
- ✅ `$pageview` - Page view (automatic)
- ✅ `$pageleave` - Page exit (automatic)
- 📝 `feature_discovered` - User found new feature
- 📝 `help_accessed` - User viewed help docs
- 📝 `search_performed` - User searched for something

> ✅ = Hooks available, ready to implement
> 📝 = Should be added based on your needs

## Creating Dashboards in PostHog

### 1. Workflow Performance Dashboard

Create a new dashboard in PostHog with these insights:

- **Success Rate**:
  - Insight type: Trends
  - Event: `workflow_executed`
  - Filter: `properties.success == true`
  - Display as: Percentage

- **Execution Duration**:
  - Insight type: Trends
  - Event: `workflow_executed`
  - Aggregate: Average of `properties.duration_ms`

- **Popular Workflows**:
  - Insight type: Trends
  - Event: `workflow_executed`
  - Breakdown by: `properties.workflow_id`

### 2. CRM Funnel Dashboard

- **Lead to Customer Funnel**:
  - Insight type: Funnel
  - Steps:
    1. `contact_created`
    2. `contact_lifecycle_changed` (to_stage = QUALIFIED)
    3. `deal_created`
    4. `deal_won`

- **Deal Progression**:
  - Insight type: Trends
  - Event: `deal_stage_changed`
  - Breakdown by: `properties.to_stage`

### 3. Embedding Dashboards

Once you create dashboards in PostHog:

1. Go to your dashboard
2. Click "Share" → "Embed dashboard"
3. Copy the iframe code
4. Add it to `/app/(dashboard)/(rest)/analytics/page.tsx`:

```typescript
<div className="h-[500px] w-full">
  <iframe
    src="https://app.posthog.com/embedded/YOUR_DASHBOARD_ID"
    className="w-full h-full border-0"
  />
</div>
```

## Best Practices

### 1. Always Include Context

```typescript
trackEvent("action_taken", {
  organization_id: organizationId,
  subaccount_id: subaccountId,
  user_id: userId,
  // ... other relevant properties
});
```

### 2. Track Both Success and Failure

```typescript
try {
  await executeWorkflow(workflowId);
  trackWorkflowEvent("executed", workflowId, { success: true });
} catch (error) {
  trackWorkflowEvent("executed", workflowId, {
    success: false,
    error: error.message,
  });
}
```

### 3. Use Groups for Multi-Tenant Analysis

```typescript
// Set organization properties once on login
setGroupProperties("organization", orgId, {
  name: org.name,
  plan: "premium",
  member_count: org.members.length,
});

// Include group in events
trackEvent("feature_used", {
  $groups: { organization: orgId },
});
```

### 4. Respect Privacy

- Only track necessary data
- Avoid tracking PII (emails, phone numbers, etc.) in event properties
- Use anonymization for sensitive data
- Comply with GDPR/privacy regulations

## Agency vs Client Tracking

To separate analytics for agency users vs their clients:

```typescript
const { trackEvent, setGroupProperties } = useAnalytics();

// On login/context switch
if (activeSubaccountId) {
  // User is viewing a client's data
  setGroupProperties("subaccount", activeSubaccountId, {
    organization_id: organizationId,
    name: subaccount.name,
  });

  trackEvent("$pageview", {
    $groups: {
      organization: organizationId,
      subaccount: activeSubaccountId,
    },
    user_type: "agency_member_viewing_client",
  });
} else {
  // User is at agency level
  trackEvent("$pageview", {
    $groups: { organization: organizationId },
    user_type: "agency_admin",
  });
}
```

Then in PostHog, you can:
- Filter by `properties.user_type`
- Break down by `$group_0` (organization) or `$group_1` (subaccount)
- Create separate dashboards for agency vs client views

## Next Steps

1. ✅ Add PostHog credentials to environment
2. 📝 Implement event tracking in key user flows:
   - Workflow editor (node add/remove/configure)
   - Contact/Deal CRUD operations
   - Integration connections
   - Form submissions
3. 📝 Create dashboards in PostHog
4. 📝 Embed dashboards in `/analytics` page
5. 📝 Set up alerts for critical metrics
6. 📝 Configure funnels for key user journeys

## Troubleshooting

### Events not showing in PostHog?

1. Check console for PostHog initialization errors
2. Verify API key is correct in `.env.local`
3. Check PostHog project settings → Ingestion → Live events
4. Wait 30-60 seconds for events to appear (PostHog buffers events)

### User identification not working?

1. Ensure `PostHogIdentifier` is rendered in the layout
2. Check that `session.user.id` is available
3. Verify user is logged in before identifying

### Dashboards not loading?

1. Check iframe src URL is correct
2. Verify dashboard is set to "Public" or "Shared" in PostHog
3. Check browser console for CORS errors

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React Guide](https://posthog.com/docs/libraries/react)
- [Event Tracking Best Practices](https://posthog.com/docs/product-analytics/insights)
- [Group Analytics](https://posthog.com/docs/product-analytics/group-analytics)
