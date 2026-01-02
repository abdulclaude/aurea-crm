# Custom Funnel Integration - Executive Summary

## Overview

This document provides a high-level summary of the comprehensive plan to integrate custom-built funnels (like TTR) with Aurea CRM, enabling full tracking, analytics, workflow automation, and CRM synchronization.

---

## The Problem

You're building custom funnels for clients (like TTR) using Next.js with specialized packages (framer-motion, Lenis, etc.). Currently:

- ❌ These funnels exist outside Aurea CRM
- ❌ No tracking or analytics integration
- ❌ Can't trigger workflows from funnel events
- ❌ Manual process to create contacts/deals from conversions
- ❌ Missing attribution data for marketing

**The Goal:** Create a drop-in SDK that connects any custom funnel to Aurea CRM while preserving full creative control.

---

## The Solution

### 1. **Aurea Tracking SDK** (`@aurea/tracking-sdk`)

A lightweight npm package that you install in any Next.js/React project:

```bash
npm install @aurea/tracking-sdk
```

```typescript
// Initialize once in your app
import { init } from '@aurea/tracking-sdk';

const aurea = init({
  apiKey: 'aurea_xxx',      // From Aurea dashboard
  funnelId: 'funnel_123',   // From Aurea dashboard
  autoTrack: {
    pageViews: true,
    forms: true,
    scrollDepth: true,
  },
});

// Track custom events
aurea.track('checkout_initiated', { productId: 'ttr', price: 99 });

// Identify users
aurea.identify('user@example.com', { name: 'John Doe' });

// Track conversions
aurea.conversion({
  type: 'purchase',
  revenue: 99,
  orderId: 'order_123',
});
```

**Features:**
- ✅ Automatic page view tracking
- ✅ Form submission tracking
- ✅ Custom event tracking
- ✅ Conversion tracking with revenue
- ✅ User identification
- ✅ Session management
- ✅ UTM parameter capture
- ✅ Device/browser detection
- ✅ Batched event sending (performance optimized)
- ✅ React hooks and components included

### 2. **Funnel Registration in Aurea**

In the Aurea dashboard, register your external funnel:

1. Navigate to **Funnels** → **Add External Funnel**
2. Enter funnel details:
   - Name: "TTR Membership Funnel"
   - URL: https://thetradingroadmap.com
   - Additional domains: (optional)
3. Configure tracking options
4. Get API key and Funnel ID
5. Install SDK in your custom funnel

**Result:** The funnel appears in your Funnels list (read-only, marked as "External")

### 3. **Real-Time Analytics**

View comprehensive analytics for your external funnel:

**Live Stats:**
- Active visitors right now
- Events in the last hour
- Conversions today
- Revenue today

**Overview Metrics:**
- Total sessions
- Unique visitors
- Page views
- Conversion rate
- Bounce rate
- Average session duration
- Total revenue
- Average order value

**Traffic Sources:**
- Breakdown by UTM source/medium/campaign
- Conversion rates per source
- Revenue attribution

**Event Analytics:**
- Top events by frequency
- Event timeline (charts)
- Custom event filtering

**All in real-time** with live dashboard updates!

### 4. **Automatic CRM Integration**

When events happen in your funnel, Aurea automatically:

**On Conversion:**
- ✅ Creates or updates Contact
- ✅ Sets lifecycle stage to "Customer"
- ✅ Adds funnel attribution data
- ✅ Increases lead score
- ✅ Optionally creates Deal

**On Form Submit:**
- ✅ Creates Contact (if identified)
- ✅ Captures form data
- ✅ Tags with funnel source

**On Checkout Abandoned:**
- ✅ Tags contact as "abandoned"
- ✅ Can trigger follow-up workflow

### 5. **Workflow Automation**

Create workflows triggered by funnel events:

**New Trigger Node:** "Funnel Event"
- Choose funnel
- Choose event (conversion, form_submit, checkout_abandoned, etc.)
- Add filters (optional)

**Example Workflows:**

**Abandoned Cart Recovery:**
```
Trigger: Funnel Event (checkout_abandoned)
→ Wait 30 minutes
→ Send Email (recovery offer)
→ Wait 24 hours
→ Send SMS (last chance)
```

**Welcome Sequence:**
```
Trigger: Funnel Event (conversion)
→ Create Deal
→ Send Email (welcome)
→ Wait 3 days
→ Send Email (onboarding tips)
```

**Lead Scoring:**
```
Trigger: Funnel Event (page_view on /pricing)
→ Update Contact (increase score +10)
→ If score > 50
  → Notify sales team
```

### 6. **Pixel Forwarding** (Future Enhancement)

Events tracked by the SDK can be automatically forwarded to:
- Meta Pixel (Facebook/Instagram Ads)
- Google Analytics 4
- TikTok Pixel
- LinkedIn Insight Tag
- Custom pixels

**Server-side tracking** ensures accuracy even with ad blockers and iOS privacy features.

---

## Integration Example: TTR Funnel

### Step 1: Install SDK

```bash
cd ~/Desktop/ttr
npm install @aurea/tracking-sdk
```

### Step 2: Initialize in Layout

```typescript
// ttr/src/app/layout.tsx
import { init } from '@aurea/tracking-sdk';

if (typeof window !== 'undefined') {
  init({
    apiKey: process.env.NEXT_PUBLIC_AUREA_API_KEY!,
    funnelId: process.env.NEXT_PUBLIC_AUREA_FUNNEL_ID!,
    autoTrack: {
      pageViews: true,
      forms: true,
      scrollDepth: true,
    },
  });
}
```

### Step 3: Track Checkout Initiation

```typescript
// ttr/src/components/buy-button.tsx
import { getInstance } from '@aurea/tracking-sdk';

export function BuyButton({ children, ...props }) {
  async function onClick() {
    // Track in Aurea
    const aurea = getInstance();
    aurea?.track('checkout_initiated', {
      product: 'TTR Membership',
      price: 99,
    });
    
    // Redirect to Whop
    window.location.href = whopUrl;
  }
  
  // ... rest of component
}
```

### Step 4: Track Purchase (Webhook)

```typescript
// ttr/src/app/api/webhooks/whop/route.ts
import { getInstance } from '@aurea/tracking-sdk/server';

export async function POST(request: NextRequest) {
  // ... verify webhook
  
  if (type === "payment.succeeded") {
    // Track in Aurea
    await fetch(`${process.env.AUREA_API_URL}/track/events`, {
      method: 'POST',
      headers: {
        'X-Aurea-API-Key': process.env.AUREA_API_KEY!,
        'X-Aurea-Funnel-ID': process.env.AUREA_FUNNEL_ID!,
      },
      body: JSON.stringify({
        events: [{
          eventId: generateId(),
          eventName: 'conversion',
          properties: {
            conversionType: 'purchase',
            revenue: finalAmount / 100,
            currency: 'USD',
            orderId: data.id,
          },
          context: {
            user: {
              userId: email,
            },
            session: {
              sessionId: getSessionId(),
            },
          },
          timestamp: Date.now(),
        }],
      }),
    });
    
    // ... rest of webhook handler
  }
}
```

### Step 5: Set Up Workflows in Aurea

**Workflow 1: Welcome New Members**
- Trigger: Funnel Event (conversion from TTR funnel)
- Actions:
  - Create Contact (email from event)
  - Create Deal ($99 value)
  - Send Welcome Email
  - Add to Telegram group

**Workflow 2: Recover Abandoned Checkouts**
- Trigger: Funnel Event (checkout_abandoned from TTR funnel)
- Actions:
  - Wait 30 minutes
  - Send Email (limited-time discount)
  - Wait 24 hours
  - Send Discord DM (last chance offer)

---

## Competitive Advantages

### vs GoHighLevel
- ✅ **More flexible:** Use ANY tech stack, not just their builder
- ✅ **Better DX:** TypeScript SDK with full type safety
- ✅ **Custom packages:** Use framer-motion, Lenis, etc.
- ✅ **No design limitations:** Full creative control

### vs ClickFunnels
- ✅ **Custom code:** Not limited to drag-and-drop builder
- ✅ **Better pricing:** No per-funnel fees
- ✅ **Unified platform:** CRM + Workflows + Funnels in one
- ✅ **Open-source friendly:** SDK could be open-sourced

### vs Perspective Funnels
- ✅ **All-in-one:** Don't need separate CRM integration
- ✅ **Workflow automation:** Built-in automation engine
- ✅ **Developer-first:** Better docs and SDK design

### Unique to Aurea
- ✅ **Read-only external funnels:** Track without editing
- ✅ **Inngest workflows:** Powerful automation engine
- ✅ **Multi-channel:** SMS, Email, Telegram, WhatsApp, etc.
- ✅ **AI integration:** Can use AI in workflows
- ✅ **Multi-tenant:** Perfect for agencies with multiple clients

---

## Technical Architecture

```
┌─────────────────────────────┐
│   Custom Funnel (Next.js)   │
│   - TTR codebase            │
│   - framer-motion           │
│   - Aurea SDK installed     │
└──────────────┬──────────────┘
               │ Events
               ▼
┌─────────────────────────────┐
│  Aurea Tracking API (Edge)  │
│  - /api/track/events        │
│  - Rate limiting            │
│  - Authentication           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│   Inngest Event Processing  │
│   - Enrich events           │
│   - Update analytics        │
│   - Sync to CRM             │
│   - Trigger workflows       │
│   - Forward to pixels       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      PostgreSQL (Prisma)    │
│   - FunnelEvent             │
│   - FunnelSession           │
│   - FunnelAnalytics         │
│   - Contact (CRM)           │
│   - Deal (CRM)              │
└─────────────────────────────┘
```

---

## Database Schema (Key Tables)

### FunnelEvent
Stores every tracked event:
- Event ID (unique)
- Funnel ID
- Event name (conversion, page_view, etc.)
- Event properties (JSON)
- User ID / Anonymous ID
- Session ID
- UTM parameters
- Device/browser info
- Geographic data
- Timestamp

### FunnelSession
Aggregated session data:
- Session ID (unique)
- Funnel ID
- Start/end time
- Page views count
- Events count
- Converted (boolean)
- Conversion value
- Attribution (first/last touch)
- Device info

### FunnelAnalyticsSummary
Daily aggregated analytics:
- Date
- Funnel ID
- Source/medium/campaign
- Sessions, visitors, page views
- Conversions, revenue
- Bounce rate, avg session duration
- Conversion rate, AOV

---

## Implementation Timeline

### Phase 1: Foundation (2 weeks)
- Build `@aurea/tracking-sdk` package
- Create event ingestion API
- Add database schema
- Implement funnel registration

### Phase 2: Analytics (2 weeks)
- Build event processing (Inngest)
- Create analytics dashboard
- Add real-time stats
- Implement traffic source tracking

### Phase 3: CRM Integration (2 weeks)
- Auto-create contacts from events
- Auto-create deals from conversions
- Add funnel attribution
- Build lead scoring

### Phase 4: Workflows (2 weeks)
- Create "Funnel Event" trigger node
- Add workflow execution on events
- Build abandonment recovery templates
- Create welcome sequence templates

### Phase 5: Advanced Features (2 weeks)
- Add pixel forwarding (Meta, GA4)
- Implement A/B testing support
- Add session recording (optional)
- Build revenue attribution

### Phase 6: Polish (2 weeks)
- Write comprehensive docs
- Create integration guide
- Build example templates
- Performance optimization
- Security audit

**Total: ~12 weeks** to full feature parity with competitors

---

## Immediate Next Steps

1. **Review this plan** with your team
2. **Prioritize features** based on client needs
3. **Set up project structure** for SDK package
4. **Create database migrations** for new tables
5. **Build MVP** (Phase 1) to test with TTR funnel

---

## ROI & Business Impact

### For You (Agency Owner)
- ✅ Offer advanced tracking to clients
- ✅ Compete with GoHighLevel/ClickFunnels
- ✅ Keep creative freedom (custom code)
- ✅ Unified client dashboard (one platform)
- ✅ Recurring revenue opportunity

### For Your Clients
- ✅ Better conversion tracking
- ✅ Automated follow-up workflows
- ✅ Lead recovery (abandoned carts)
- ✅ Attribution data for ad optimization
- ✅ Real-time analytics

### Pricing Potential
- **Pro Plan:** $197/mo - 5 funnels, 100K events/mo
- **Business Plan:** $397/mo - 20 funnels, 500K events/mo
- **Enterprise Plan:** $997/mo - Unlimited funnels, 5M events/mo

---

## Success Metrics

### Technical
- Event ingestion < 100ms (p95)
- Dashboard load < 1s
- SDK bundle < 50KB
- 99.9% API uptime

### Business
- Number of external funnels connected
- Total events tracked per month
- Workflow automation usage
- Customer retention rate

---

## Security & Privacy

- ✅ GDPR compliant by default
- ✅ IP anonymization
- ✅ Respect Do Not Track
- ✅ Encrypted API keys
- ✅ Rate limiting per funnel
- ✅ Data retention policies
- ✅ Right to deletion

---

## Documentation & Support

### For Developers
- SDK installation guide
- API reference
- React hooks documentation
- TypeScript types
- Example integrations
- Migration guides

### For Users
- Dashboard user guide
- Workflow templates
- Best practices
- Video tutorials
- Community forum
- Email support

---

## Conclusion

This comprehensive integration system allows you to:

1. **Build beautiful custom funnels** with any tech stack
2. **Track everything** automatically with a simple SDK
3. **View analytics** in real-time in Aurea dashboard
4. **Automate workflows** based on funnel events
5. **Sync to CRM** without manual work
6. **Compete with** GoHighLevel and ClickFunnels

**All while maintaining full creative control and using your favorite tools.**

The system is designed to be:
- **Developer-friendly** (TypeScript, React, great DX)
- **Privacy-first** (GDPR compliant, transparent)
- **Performant** (edge APIs, batching, caching)
- **Scalable** (handles millions of events)
- **Secure** (encrypted keys, rate limiting, validation)

---

## Questions or Feedback?

This is a comprehensive plan, but it's meant to be iterated on. Key questions to consider:

1. Should we prioritize certain features over others?
2. Are there specific client needs driving this?
3. What's the target launch date for MVP?
4. Should the SDK be open-source?
5. What's the pricing strategy?

Let me know if you'd like me to dive deeper into any specific area or create any additional documentation!
