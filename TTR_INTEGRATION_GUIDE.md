# TTR Funnel - Aurea Integration Guide

This guide shows exactly how to integrate the TTR funnel with Aurea CRM using the tracking SDK.

---

## Step 1: Register Funnel in Aurea Dashboard

1. Log into Aurea CRM at `https://app.aureacrm.com`
2. Navigate to **Funnels** → **Add External Funnel**
3. Fill in the form:
   - **Name:** TTR Membership Funnel
   - **Description:** The Trading Roadmap paid membership funnel
   - **Primary URL:** https://thetradingroadmap.com
   - **Additional Domains:** (none)
   - **Auto-track Settings:**
     - ✅ Page views
     - ✅ Form submissions
     - ✅ Scroll depth
     - ⬜ Click tracking (manual)
4. Click **Create External Funnel**
5. **IMPORTANT:** Copy the API Key and Funnel ID (only shown once!)
   - API Key: `aurea_sk_live_xxxxxxxxxxxxx`
   - Funnel ID: `funnel_clxxxxxxxxxx`

---

## Step 2: Install Aurea SDK in TTR

```bash
cd ~/Desktop/ttr
npm install @aurea/tracking-sdk
```

---

## Step 3: Add Environment Variables

```bash
# ttr/.env.local

# Existing vars
NEXT_PUBLIC_WHOP_CHECKOUT_URL=...
DISCORD_INITIATE_WEBHOOK_URL=...
# ... other vars

# NEW: Aurea Integration
NEXT_PUBLIC_AUREA_API_KEY=aurea_sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_AUREA_FUNNEL_ID=funnel_clxxxxxxxxxx
AUREA_API_URL=https://app.aureacrm.com/api
```

---

## Step 4: Initialize SDK

Create a new file for Aurea integration:

```typescript
// ttr/src/lib/aurea.ts

import { init } from '@aurea/tracking-sdk';

let sdkInitialized = false;

export function initAurea() {
  if (sdkInitialized || typeof window === 'undefined') {
    return;
  }
  
  const apiKey = process.env.NEXT_PUBLIC_AUREA_API_KEY;
  const funnelId = process.env.NEXT_PUBLIC_AUREA_FUNNEL_ID;
  
  if (!apiKey || !funnelId) {
    console.warn('[Aurea] Missing API key or Funnel ID');
    return;
  }
  
  init({
    apiKey,
    funnelId,
    debug: process.env.NODE_ENV === 'development',
    
    autoTrack: {
      pageViews: true,
      forms: true,
      clicks: false,
      scrollDepth: true,
    },
    
    respectDoNotTrack: true,
    anonymizeIp: true,
  });
  
  sdkInitialized = true;
  console.log('[Aurea] SDK initialized');
}

// Helper: Get SDK instance
export function getAurea() {
  return (window as any).aurea;
}

// Helper: Track custom event
export function trackEvent(name: string, properties?: Record<string, any>) {
  const aurea = getAurea();
  if (aurea) {
    aurea.track(name, properties);
  }
}

// Helper: Identify user
export function identifyUser(email: string, traits?: Record<string, any>) {
  const aurea = getAurea();
  if (aurea) {
    aurea.identify(email, traits);
  }
}

// Helper: Track conversion
export function trackConversion(data: {
  type: string;
  revenue: number;
  orderId: string;
  properties?: Record<string, any>;
}) {
  const aurea = getAurea();
  if (aurea) {
    aurea.conversion({
      type: data.type,
      revenue: data.revenue,
      currency: 'USD',
      orderId: data.orderId,
      properties: data.properties,
    });
  }
}
```

---

## Step 5: Initialize in Root Layout

```typescript
// ttr/src/app/layout.tsx

import { initAurea } from "@/lib/aurea";
import { useEffect } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initAurea();
  }, []);
  
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
```

**Note:** Page views will now be automatically tracked!

---

## Step 6: Track Checkout Initiation

Update the buy button to track when users click to checkout:

```typescript
// ttr/src/components/buy-button.tsx

"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ComponentProps } from "react";
import { trackEvent } from "@/lib/aurea"; // NEW

interface BuyButtonProps {
  children: React.ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
  initial?: { opacity: number; y: number };
  animate?: { opacity: number; y: number };
  transition?: { duration: number; delay?: number };
}

export function BuyButton({
  children,
  variant = "gradient",
  className = "relative text-[14px] rounded-[12px]",
  initial,
  animate,
  transition,
}: BuyButtonProps) {
  const whopUrl =
    process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL || "https://whop.com/your-product";

  async function onClick() {
    // NEW: Track in Aurea
    trackEvent('checkout_initiated', {
      product: 'TTR Membership',
      productId: 'ttr_membership',
      price: 99,
      currency: 'USD',
      checkoutUrl: whopUrl,
    });
    
    // Existing: Fire Discord webhook
    fetch("/api/events/initiate-checkout", { method: "POST" }).catch(() => {});
    
    // Redirect to Whop
    window.location.href = whopUrl;
  }

  const buttonContent = (
    <Button onClick={onClick} className={className} variant={variant}>
      {children}
    </Button>
  );

  if (initial || animate || transition) {
    return (
      <motion.div
        initial={initial}
        animate={animate}
        transition={transition}
      >
        {buttonContent}
      </motion.div>
    );
  }

  return buttonContent;
}
```

---

## Step 7: Track Purchases (Whop Webhook)

Update the Whop webhook to track successful purchases:

```typescript
// ttr/src/app/api/webhooks/whop/route.ts

import { NextRequest } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { sendDiscord, createEmbed } from "@/lib/discord";
import { addToMailingList } from "@/lib/resend-client";
import {
  sendWelcomeEmail,
  sendCancellationEmail,
  sendRefundEmail,
  sendMembershipExpiredEmail,
} from "@/lib/emails";
import { storeUserEmail, getUserFromDatabase } from "@/lib/db/user-service";

// NEW: Server-side tracking helper
async function trackToAurea(eventName: string, properties: any) {
  const apiKey = process.env.AUREA_API_KEY;
  const funnelId = process.env.AUREA_FUNNEL_ID;
  const apiUrl = process.env.AUREA_API_URL;
  
  if (!apiKey || !funnelId || !apiUrl) {
    console.warn('[Aurea] Missing credentials, skipping tracking');
    return;
  }
  
  try {
    await fetch(`${apiUrl}/track/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aurea-API-Key': apiKey,
        'X-Aurea-Funnel-ID': funnelId,
      },
      body: JSON.stringify({
        events: [{
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          eventName,
          properties,
          context: {
            user: properties.userId ? {
              userId: properties.userId,
            } : {},
            session: {
              sessionId: 'server_side',
            },
          },
          timestamp: Date.now(),
        }],
      }),
    });
    
    console.log(`[Aurea] Tracked ${eventName}`);
  } catch (error) {
    console.error('[Aurea] Failed to track event:', error);
  }
}

export async function POST(request: NextRequest) {
  console.log("🔔 Whop webhook received");

  // Verify webhook authenticity via Whop SDK
  const raw = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: any;
  try {
    webhookData = whopsdk.webhooks.unwrap(raw, { headers });
    console.log("✅ Webhook signature verified");
  } catch (err) {
    console.error("❌ Invalid Whop webhook signature", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const type = webhookData.type as string;
  const data = webhookData.data;

  console.log(`📋 Processing webhook type: ${type}`);

  // Extract user and product information
  const username = data?.user?.username ?? "";
  const name = data?.user?.name ?? "";
  const email = data?.user?.email ?? data?.email ?? "";
  const product = data?.product?.title ?? "";

  // Split name into first/last if available
  const nameParts = name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Extract payment information
  const finalAmount = data?.final_amount;
  const subtotal = data?.subtotal;
  const currency = data?.currency?.toUpperCase() ?? "USD";

  const formatPrice = (amount: number | undefined) => {
    if (!amount) return "N/A";
    return `${currency} ${(amount / 100).toFixed(2)}`;
  };

  // Route events to appropriate Discord channels
  if (type === "payment.succeeded") {
    // NEW: Track purchase in Aurea
    if (email && finalAmount) {
      await trackToAurea('conversion', {
        userId: email,
        conversionType: 'purchase',
        revenue: finalAmount / 100,
        currency,
        orderId: data?.id || 'unknown',
        productName: product,
        customerName: name,
        username,
      });
    }
    
    // Existing Discord notification
    const fields = [
      { name: "User", value: `${name} (@${username})`, inline: true },
      { name: "Product", value: product, inline: true },
    ];

    if (finalAmount) {
      fields.push({
        name: "Amount",
        value: formatPrice(finalAmount),
        inline: true,
      });

      if (subtotal !== finalAmount) {
        fields.push({
          name: "Subtotal",
          value: formatPrice(subtotal),
          inline: true,
        });
      }
    }

    await sendDiscord(
      process.env.DISCORD_PAYMENTS_WEBHOOK_URL!,
      createEmbed({
        title: "💰 Payment Succeeded",
        description: "A new payment has been successfully processed!",
        color: "success",
        fields,
      })
    );

    // Capture email for mailing list
    if (email) {
      const userId = data?.user?.id;
      if (userId) {
        await storeUserEmail(userId, email, name, username);
      }

      await addToMailingList({
        email,
        firstName,
        lastName,
        source: "payment.succeeded",
      });

      await new Promise((resolve) => setTimeout(resolve, 600));
      await sendWelcomeEmail(email, name || username);
    }
  }
  
  // NEW: Track abandoned checkouts
  if (type === "payment.failed" || type === "payment.pending") {
    if (email) {
      await trackToAurea('checkout_abandoned', {
        userId: email,
        reason: type === 'payment.failed' ? 'payment_failed' : 'payment_pending',
        attemptedAmount: finalAmount ? finalAmount / 100 : undefined,
        currency,
        customerName: name,
        username,
      });
    }
  }

  // ... rest of existing webhook handlers (payment.failed, membership.activated, etc.)
  
  // Return 200 quickly to prevent Whop retries
  return new Response("OK", { status: 200 });
}
```

Don't forget to add the new env vars to `.env.local`:

```bash
# Server-side tracking (no NEXT_PUBLIC_ prefix)
AUREA_API_KEY=aurea_sk_live_xxxxxxxxxxxxx
AUREA_FUNNEL_ID=funnel_clxxxxxxxxxx
AUREA_API_URL=https://app.aureacrm.com/api
```

---

## Step 8: (Optional) Track Specific Sections

Track engagement on specific sections:

```typescript
// ttr/src/components/sections/about.tsx

"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/aurea";

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const tracked = useRef(false);
  
  useEffect(() => {
    if (tracked.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !tracked.current) {
          trackEvent('section_viewed', {
            section: 'about',
            sectionName: 'About TTR',
          });
          tracked.current = true;
        }
      },
      { threshold: 0.5 } // 50% visible
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <section ref={sectionRef} id="about">
      {/* existing content */}
    </section>
  );
}
```

---

## Step 9: View Analytics in Aurea

1. Go to **Funnels** in Aurea
2. Click on **TTR Membership Funnel**
3. See real-time stats:
   - Active visitors
   - Page views
   - Conversions today
   - Revenue today

4. Navigate to **Analytics** tab:
   - Total sessions
   - Unique visitors
   - Conversion rate
   - Average order value
   - Traffic sources breakdown
   - Top events

5. Navigate to **Events** tab:
   - See live event stream
   - Filter by event type
   - View event properties
   - Search by user

---

## Step 10: Set Up Workflows

### Workflow 1: Welcome New Members

1. Go to **Workflows** → **Create Workflow**
2. Name: "TTR - Welcome New Member"
3. Add trigger:
   - Type: **Funnel Event**
   - Funnel: TTR Membership Funnel
   - Event: conversion
   - Filter: `conversionType === 'purchase'`

4. Add actions:
   - **Create Contact**
     - Email: `{{trigger.userId}}`
     - Name: `{{trigger.customerName}}`
     - Source: "TTR Funnel"
     - Lifecycle Stage: "Customer"
     - Tags: ["ttr-member"]
   
   - **Create Deal**
     - Title: "TTR Membership - {{trigger.customerName}}"
     - Value: `{{trigger.revenue}}`
     - Stage: "Won"
     - Contact: (link to contact created above)
   
   - **Send Email** (via Resend or your email provider)
     - To: `{{trigger.userId}}`
     - Template: "Welcome to TTR"
     - Variables: Pass customer name, order details
   
   - **Wait** (3 days)
   
   - **Send Email**
     - Template: "Getting Started with TTR"

5. Publish workflow

**Result:** Every time someone purchases TTR membership, they automatically:
- Get added to your CRM as a Customer
- Have a Deal created (marked as Won)
- Receive welcome email immediately
- Receive getting-started email after 3 days

### Workflow 2: Recover Abandoned Checkouts

1. Create workflow: "TTR - Recover Abandoned Checkout"
2. Add trigger:
   - Type: **Funnel Event**
   - Funnel: TTR Membership Funnel
   - Event: checkout_abandoned

3. Add actions:
   - **Create/Update Contact**
     - Email: `{{trigger.userId}}`
     - Tags: ["checkout-abandoned"]
     - Lead Score: +5
   
   - **Wait** (30 minutes)
   
   - **Send Email**
     - Template: "Complete Your Purchase - 10% Off"
     - Discount code: COMEBACK10
   
   - **Wait** (24 hours)
   
   - **Check Condition**
     - If: Contact has NOT converted (check conversion event)
     - Then: Continue
     - Else: Stop workflow
   
   - **Send Discord DM** (or Email)
     - Template: "Last Chance - Join TTR Today"

4. Publish workflow

**Result:** When someone abandons checkout:
- They're added to CRM with "checkout-abandoned" tag
- After 30 min, receive recovery email with discount
- After 24 hours, receive final reminder (only if they haven't purchased)

---

## Step 11: Monitor Performance

### View in Aurea Dashboard

**Real-Time:**
- Currently active visitors on TTR
- Live event stream
- Today's conversions and revenue

**Overview:**
- Total visitors this month
- Conversion rate trend
- Revenue by traffic source
- Top performing pages/sections

**Contacts:**
- Filter contacts by source: "TTR Funnel"
- See which contacts came from which campaign (UTM tracking)
- View engagement timeline per contact

**Deals:**
- See all TTR membership deals
- Track revenue from funnel
- Monitor deal velocity

---

## Events Being Tracked

### Automatic (via autoTrack settings)
- ✅ `page_view` - Every page visit
- ✅ `scroll_depth` - 25%, 50%, 75%, 100% scroll
- ✅ `form_submit` - Any form submission (if you add forms later)

### Manual (via trackEvent calls)
- ✅ `checkout_initiated` - When buy button clicked
- ✅ `conversion` - When payment succeeds
- ✅ `checkout_abandoned` - When payment fails/pending
- ✅ `section_viewed` - When specific section comes into view (optional)

### Properties Captured Automatically
- Page URL and title
- Referrer
- UTM parameters (source, medium, campaign, term, content)
- Device type (mobile, tablet, desktop)
- Browser and OS
- Screen resolution
- Geographic location (country, city)
- Session ID (links multiple page views)
- Anonymous ID (tracks returning visitors)

---

## Testing the Integration

### 1. Test Event Tracking

Open browser console on TTR site and run:
```javascript
window.aurea.track('test_event', { foo: 'bar' });
```

Check Aurea dashboard → Events to see if it appears.

### 2. Test Page View Tracking

Navigate between pages on TTR. Check Aurea dashboard for page_view events.

### 3. Test Checkout Initiation

Click a buy button. Check for `checkout_initiated` event in dashboard.

### 4. Test Purchase (Staging)

Use Whop's test mode to simulate a purchase. Verify:
- `conversion` event appears
- Contact is created
- Deal is created
- Welcome workflow triggers

### 5. Test Abandoned Checkout

Simulate a failed payment. Verify:
- `checkout_abandoned` event appears
- Abandonment workflow triggers
- Recovery email is sent after 30 min

---

## Troubleshooting

### Events not appearing in dashboard

**Check:**
1. API key and Funnel ID are correct in `.env.local`
2. SDK initialized (check browser console for "[Aurea] SDK initialized")
3. No CORS errors in browser console
4. Funnel is "Published" in Aurea dashboard

**Debug:**
```javascript
// In browser console
window.aurea.track('debug_test', { timestamp: Date.now() });
```

Check network tab for request to `/api/track/events`.

### Workflows not triggering

**Check:**
1. Workflow is Published (not Draft)
2. Trigger event name matches exactly (case-sensitive)
3. Filters are not too restrictive
4. Check Workflow Executions page for errors

### Conversions not creating contacts

**Check:**
1. `userId` is being passed in event (should be email)
2. Email format is valid
3. Subaccount context is set correctly in workflow

---

## Best Practices

### 1. Event Naming
Use consistent naming convention:
- `snake_case` for event names
- Present tense verbs: `checkout_initiated` not `checkout_initiate`
- Specific: `ttr_video_watched` not `video_watched`

### 2. Properties
Include useful context:
```javascript
trackEvent('button_clicked', {
  buttonId: 'hero-cta',
  buttonText: 'Join Now',
  section: 'hero',
  destination: '/checkout',
});
```

### 3. User Identification
Identify users as soon as you know their email:
```javascript
// After form submission
identifyUser(email, {
  name: fullName,
  source: 'ttr_form',
  signupDate: new Date().toISOString(),
});
```

### 4. Revenue Tracking
Always include revenue in conversions:
```javascript
trackConversion({
  type: 'purchase',
  revenue: 99.00, // Use actual amount
  orderId: 'order_123',
  properties: {
    productName: 'TTR Membership',
    paymentMethod: 'card',
  },
});
```

### 5. Privacy
Don't track sensitive data:
- ❌ Credit card numbers
- ❌ Passwords
- ❌ Social security numbers
- ✅ Order IDs, product names, amounts

---

## Next Steps

1. **Deploy to production** after testing
2. **Monitor for first week** to ensure data flows correctly
3. **Set up additional workflows** as needed:
   - Referral tracking
   - Engagement scoring
   - Upsell sequences
4. **Add more tracking** to specific user journeys
5. **Create custom reports** in analytics dashboard

---

## Support

If you run into issues:
1. Check browser console for errors
2. Check Aurea dashboard → Events → Errors
3. Review this guide
4. Contact Aurea support with:
   - Funnel ID
   - Example event that's not working
   - Browser console logs
   - Network request/response

---

## Summary

You've now:
- ✅ Registered TTR funnel in Aurea
- ✅ Installed and initialized the SDK
- ✅ Added tracking to buy button
- ✅ Integrated Whop webhook with Aurea
- ✅ Set up analytics dashboard
- ✅ Created automation workflows

**Result:** Full visibility into your funnel performance with automatic CRM updates and workflow automation, all while keeping your beautiful custom TTR design and codebase!
